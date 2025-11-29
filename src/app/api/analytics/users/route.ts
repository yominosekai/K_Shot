// ユーザーアクティビティ統計API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getJSTDateStart, getJSTDateString, convertUTCToJSTDateString } from '@/shared/lib/utils/timezone';
import { updateActivityAggregation, getDailyLoginCounts } from '@/shared/lib/activity-aggregator';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/analytics/users';

interface DailyData {
  date: string;
  activeUsers: number;
  newUsers: number;
}

/**
 * GET /api/analytics/users
 * ユーザーアクティビティ推移を取得（認証必須）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

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
      await updateActivityAggregation();
      const dailyCounts = getDailyLoginCounts(days);
      // 日次データ（user_activitiesテーブルから集計）
      const newUsersQuery = db.prepare(`
        SELECT 
          id,
          created_date
        FROM users
        WHERE created_date >= ?
      `);

      const startDateJST = getJSTDateString(days);
      const newUsersRaw = newUsersQuery.all(startDateStr) as Array<{ id: string; created_date: string }>;

      // 新規ユーザーはcreated_dateをJSTに変換して集計
      const newUsersMap = new Map<string, Set<string>>();
      newUsersRaw.forEach((item) => {
        const jstDate = convertUTCToJSTDateString(item.created_date);
        if (!newUsersMap.has(jstDate)) {
          newUsersMap.set(jstDate, new Set());
        }
        newUsersMap.get(jstDate)!.add(item.id);
      });

      const newUsersCountMap = new Map<string, number>();
      newUsersMap.forEach((userSet, date) => {
        newUsersCountMap.set(date, userSet.size);
      });

      // 全期間のデータを生成（今日を含めるため、days+1日分）
      // 日本時間（JST）基準で日付を生成
      for (let i = 0; i <= days; i++) {
        const dateStr = getJSTDateString(days - i);
        const daily = dailyCounts.get(dateStr);
        data.push({
          date: dateStr,
          activeUsers: daily?.loginUsers || 0,
          newUsers: newUsersCountMap.get(dateStr) || 0,
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

        const activeUsers = db
          .prepare('SELECT COUNT(DISTINCT id) as count FROM users WHERE is_active = 1 AND last_login >= ? AND last_login < ?')
          .get(weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

        const newUsers = db
          .prepare('SELECT COUNT(*) as count FROM users WHERE created_date >= ? AND created_date < ?')
          .get(weekStart.toISOString(), weekEnd.toISOString()) as { count: number };

        const weekStartJST = new Date(weekStart.getTime() + 9 * 60 * 60 * 1000);
        data.push({
          date: weekStartJST.toISOString().split('T')[0],
          activeUsers: activeUsers.count,
          newUsers: newUsers.count,
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

        const activeUsers = db
          .prepare('SELECT COUNT(DISTINCT id) as count FROM users WHERE is_active = 1 AND last_login >= ? AND last_login < ?')
          .get(monthStart.toISOString(), monthEndUTC.toISOString()) as { count: number };

        const newUsers = db
          .prepare('SELECT COUNT(*) as count FROM users WHERE created_date >= ? AND created_date < ?')
          .get(monthStart.toISOString(), monthEndUTC.toISOString()) as { count: number };

        data.push({
          date: jstMonthStart.toISOString().split('T')[0],
          activeUsers: activeUsers.count,
          newUsers: newUsers.count,
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
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      { success: false, error: 'ユーザー統計データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

