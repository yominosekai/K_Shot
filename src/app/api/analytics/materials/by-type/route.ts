// タイプ別資料統計API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { getJSTDateStart, getJSTDateString, convertUTCToJSTDateString } from '@/shared/lib/utils/timezone';

const MODULE_NAME = 'api/analytics/materials/by-type';

interface TypeData {
  date: string;
  count: number;
}

/**
 * GET /api/analytics/materials/by-type
 * タイプ別の資料数を時系列で取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const period = searchParams.get('period') || '30';
    const granularity = searchParams.get('granularity') || 'daily';

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'typeが必要です' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const days = parseInt(period, 10);
    // 日本時間（JST）基準で開始日を計算
    const startDate = getJSTDateStart(days);
    const startDateStr = startDate.toISOString();

    let data: TypeData[] = [];

    if (granularity === 'daily') {
      // 日次データ（各資料のcreated_dateを取得してJSTに変換）
      const query = db.prepare(`
        SELECT 
          id,
          created_date
        FROM materials
        WHERE is_published = 1 
          AND type = ?
          AND created_date >= ?
      `);

      const result = query.all(type, startDateStr) as Array<{ id: string; created_date: string }>;
      
      // UTC形式の日時をJST形式の日付文字列に変換して集計
      const countMap = new Map<string, number>();
      result.forEach((item) => {
        const jstDate = convertUTCToJSTDateString(item.created_date);
        const currentCount = countMap.get(jstDate) || 0;
        countMap.set(jstDate, currentCount + 1);
      });

      // 全期間のデータを生成（累積、今日を含めるため、days+1日分）
      // 日本時間（JST）基準で日付を生成
      let cumulativeCount = 0;
      for (let i = 0; i <= days; i++) {
        const dateStr = getJSTDateString(days - i);
        cumulativeCount += countMap.get(dateStr) || 0;
        data.push({
          date: dateStr,
          count: cumulativeCount,
        });
      }
    } else if (granularity === 'weekly') {
      // 週次データ
      // 日本時間（JST）基準で週の開始日と終了日を計算
      const weeks = Math.ceil(days / 7);
      let cumulativeCount = 0;
      for (let i = 0; i < weeks; i++) {
        const weekStart = getJSTDateStart(days - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const count = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND type = ? AND created_date >= ? AND created_date < ?')
          .get(type, weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

        cumulativeCount += count.count;
        const weekStartJST = new Date(weekStart.getTime() + 9 * 60 * 60 * 1000);
        data.push({
          date: weekStartJST.toISOString().split('T')[0],
          count: cumulativeCount,
        });
      }
    } else if (granularity === 'monthly') {
      // 月次データ
      // 日本時間（JST）基準で月の開始日と終了日を計算
      const months = Math.ceil(days / 30);
      let cumulativeCount = 0;
      const jstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      for (let i = 0; i < months; i++) {
        const jstMonthStart = new Date(jstNow.getFullYear(), jstNow.getMonth() - i, 1, 0, 0, 0, 0);
        const monthStart = new Date(jstMonthStart.getTime() - 9 * 60 * 60 * 1000);
        const monthEnd = new Date(jstMonthStart.getFullYear(), jstMonthStart.getMonth() + 1, 1, 0, 0, 0, 0);
        const monthEndUTC = new Date(monthEnd.getTime() - 9 * 60 * 60 * 1000);

        const count = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND type = ? AND created_date >= ? AND created_date < ?')
          .get(type, monthStart.toISOString(), monthEndUTC.toISOString()) as { count: number };

        cumulativeCount += count.count;
        data.push({
          date: jstMonthStart.toISOString().split('T')[0],
          count: cumulativeCount,
        });
      }
    }

    debug(MODULE_NAME, `タイプ別資料統計取得: type=${type}, count=${data.length}`);

    return NextResponse.json({
      success: true,
      data,
      type,
      period,
      granularity,
    });
  } catch (err) {
    error(MODULE_NAME, 'タイプ別資料統計取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'タイプ別資料統計の取得に失敗しました' },
      { status: 500 }
    );
  }
}

