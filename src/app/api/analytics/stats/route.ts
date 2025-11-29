// 統計データ取得API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getJSTDateStart, getJSTFirstDayOfMonth } from '@/shared/lib/utils/timezone';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/analytics/stats';

/**
 * GET /api/analytics/stats
 * 主要指標を取得（認証必須）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const db = getDatabase();

    // 総ユーザー数
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };

    // アクティブユーザー数（直近30日）
    // 日本時間（JST）基準で30日前を計算
    const thirtyDaysAgo = getJSTDateStart(30);
    const activeUsers = db
      .prepare('SELECT COUNT(DISTINCT id) as count FROM users WHERE is_active = 1 AND last_login >= ?')
      .get(thirtyDaysAgo.toISOString()) as { count: number };

    // 総資料数
    const totalMaterials = db.prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1').get() as { count: number };

    // 今月の新規資料数（日本時間（JST）基準）
    const firstDayOfMonth = getJSTFirstDayOfMonth();
    const newMaterialsThisMonth = db
      .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND created_date >= ?')
      .get(firstDayOfMonth.toISOString()) as { count: number };

    // 今月の資料更新数（日本時間（JST）基準）
    const updatedMaterialsThisMonth = db
      .prepare('SELECT COUNT(*) as count FROM materials WHERE is_published = 1 AND updated_date >= ? AND updated_date != created_date')
      .get(firstDayOfMonth.toISOString()) as { count: number };

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers.count,
        activeUsers: activeUsers.count,
        totalMaterials: totalMaterials.count,
        newMaterialsThisMonth: newMaterialsThisMonth.count,
        updatedMaterialsThisMonth: updatedMaterialsThisMonth.count,
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      { success: false, error: '統計データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

