// カテゴリ別資料統計API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { getJSTDateStart, getJSTDateString, convertUTCToJSTDateString } from '@/shared/lib/utils/timezone';

const MODULE_NAME = 'api/analytics/materials/by-category';

interface CategoryData {
  date: string;
  count: number;
}

/**
 * GET /api/analytics/materials/by-category
 * カテゴリ別の資料数を時系列で取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const period = searchParams.get('period') || '30';
    const granularity = searchParams.get('granularity') || 'daily';

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'category_idが必要です' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const days = parseInt(period, 10);
    // 日本時間（JST）基準で開始日を計算
    const startDate = getJSTDateStart(days);
    const startDateStr = startDate.toISOString();

    let data: CategoryData[] = [];

    if (granularity === 'daily') {
      // 日次データ（各資料のcreated_dateを取得してJSTに変換）
      const query = db.prepare(`
        SELECT 
          id,
          created_date
        FROM materials
        WHERE is_published = 1 
          AND category_id = ?
          AND created_date >= ?
      `);

      const result = query.all(categoryId, startDateStr) as Array<{ id: string; created_date: string }>;
      
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
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND category_id = ? AND created_date >= ? AND created_date < ?')
          .get(categoryId, weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

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
          .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND category_id = ? AND created_date >= ? AND created_date < ?')
          .get(categoryId, monthStart.toISOString(), monthEndUTC.toISOString()) as { count: number };

        cumulativeCount += count.count;
        data.push({
          date: jstMonthStart.toISOString().split('T')[0],
          count: cumulativeCount,
        });
      }
    }

    // カテゴリ名も取得
    const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId) as { name: string } | undefined;

    debug(MODULE_NAME, `カテゴリ別資料統計取得: category_id=${categoryId}, count=${data.length}`);

    return NextResponse.json({
      success: true,
      data,
      category_id: categoryId,
      category_name: category?.name || '',
      period,
      granularity,
    });
  } catch (err) {
    error(MODULE_NAME, 'カテゴリ別資料統計取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'カテゴリ別資料統計の取得に失敗しました' },
      { status: 500 }
    );
  }
}

