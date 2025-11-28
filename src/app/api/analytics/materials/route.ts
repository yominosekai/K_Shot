// 資料アクティビティ統計API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getJSTDateStart, getJSTDateString, convertUTCToJSTDateString } from '@/shared/lib/utils/timezone';

const MODULE_NAME = 'api/analytics/materials';

interface DailyData {
  date: string;
  created: number;
  updated: number;
}

/**
 * GET /api/analytics/materials
 * 資料アクティビティ推移を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // 30, 90, 365
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly, monthly

    const db = getDatabase();
    const days = parseInt(period, 10);
    // 日本時間（JST）基準で開始日を計算
    const startDate = getJSTDateStart(days);
    const startDateStr = startDate.toISOString();

    let data: DailyData[] = [];

    if (granularity === 'daily') {
      // 日次データ（各資料のcreated_dateとupdated_dateを取得してJSTに変換）
      const createdQuery = db.prepare(`
        SELECT 
          id,
          created_date
        FROM materials
        WHERE is_published = 1 AND created_date >= ?
      `);

      const updatedQuery = db.prepare(`
        SELECT 
          id,
          updated_date
        FROM materials
        WHERE is_published = 1 AND updated_date >= ? AND updated_date != created_date
      `);

      const createdRaw = createdQuery.all(startDateStr) as Array<{ id: string; created_date: string }>;
      const updatedRaw = updatedQuery.all(startDateStr) as Array<{ id: string; updated_date: string }>;

      // UTC形式の日時をJST形式の日付文字列に変換して集計
      const createdMap = new Map<string, number>();
      createdRaw.forEach((item) => {
        const jstDate = convertUTCToJSTDateString(item.created_date);
        const currentCount = createdMap.get(jstDate) || 0;
        createdMap.set(jstDate, currentCount + 1);
      });

      const updatedMap = new Map<string, number>();
      updatedRaw.forEach((item) => {
        const jstDate = convertUTCToJSTDateString(item.updated_date);
        const currentCount = updatedMap.get(jstDate) || 0;
        updatedMap.set(jstDate, currentCount + 1);
      });

      // 全期間のデータを生成（今日を含めるため、days+1日分）
      // 日本時間（JST）基準で日付を生成
      for (let i = 0; i <= days; i++) {
        const dateStr = getJSTDateString(days - i);
        data.push({
          date: dateStr,
          created: createdMap.get(dateStr) || 0,
          updated: updatedMap.get(dateStr) || 0,
        });
      }
    } else if (granularity === 'weekly') {
      // 週次データ（簡易実装：7日ごとに集計）
      // 日本時間（JST）基準で週の開始日と終了日を計算
      const weeks = Math.ceil(days / 7);
      for (let i = 0; i < weeks; i++) {
        const weekStart = getJSTDateStart(days - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const created = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND created_date >= ? AND created_date < ?')
          .get(weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

        const updated = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND updated_date >= ? AND updated_date < ? AND updated_date != created_date')
          .get(weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

        const weekStartJST = new Date(weekStart.getTime() + 9 * 60 * 60 * 1000);
        data.push({
          date: weekStartJST.toISOString().split('T')[0],
          created: created.count,
          updated: updated.count,
        });
      }
    } else if (granularity === 'monthly') {
      // 月次データ
      // 日本時間（JST）基準で月の開始日と終了日を計算
      const months = Math.ceil(days / 30);
      const jstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      for (let i = 0; i < months; i++) {
        const jstMonthStart = new Date(jstNow.getFullYear(), jstNow.getMonth() - i, 1, 0, 0, 0, 0);
        const monthStart = new Date(jstMonthStart.getTime() - 9 * 60 * 60 * 1000);
        const monthEnd = new Date(jstMonthStart.getFullYear(), jstMonthStart.getMonth() + 1, 1, 0, 0, 0, 0);
        const monthEndUTC = new Date(monthEnd.getTime() - 9 * 60 * 60 * 1000);

        const created = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND created_date >= ? AND created_date < ?')
          .get(monthStart.toISOString(), monthEndUTC.toISOString()) as { count: number };

        const updated = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND updated_date >= ? AND updated_date < ? AND updated_date != created_date')
          .get(monthStart.toISOString(), monthEndUTC.toISOString()) as { count: number };

        data.push({
          date: jstMonthStart.toISOString().split('T')[0],
          created: created.count,
          updated: updated.count,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data,
      period,
      granularity,
    });
  } catch (err) {
    console.error('[API] /api/analytics/materials GET エラー:', err);
    return NextResponse.json(
      { success: false, error: '資料統計データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

