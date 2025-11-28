// データベーステーブル一覧取得API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getActivityAggregatorDb } from '@/shared/lib/activity-aggregator/local-db';
import { authenticateUser } from '@/features/auth/api/auth';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/database/tables';

/**
 * GET /api/admin/database/tables?type=network|local
 * データベースのテーブル一覧を取得（管理者のみ）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await authenticateUser();
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 管理者権限チェック
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dbType = searchParams.get('type') || 'network';

    // DBタイプに応じて適切なDBを取得
    const db = dbType === 'local' ? getActivityAggregatorDb() : getDatabase();

    // SQLiteのテーブル一覧を取得
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as Array<{ name: string }>;

    // 各テーブルの行数を取得
    const tablesWithCount = tables.map((table) => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as {
          count: number;
        };
        return {
          name: table.name,
          rowCount: count.count,
        };
      } catch (err) {
        error(MODULE_NAME, `テーブル ${table.name} の行数取得エラー:`, err);
        return {
          name: table.name,
          rowCount: 0,
        };
      }
    });

    debug(MODULE_NAME, `テーブル一覧取得: ${tablesWithCount.length}件`);

    return NextResponse.json({
      success: true,
      tables: tablesWithCount,
    });
  } catch (err) {
    error(MODULE_NAME, 'テーブル一覧取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'テーブル一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

