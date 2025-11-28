// 部署一覧取得API

import { NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/departments';

/**
 * GET /api/departments
 * 部署一覧を取得
 */
export async function GET() {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM departments ORDER BY name').all() as Array<{
      id: string;
      name: string;
      description: string | null;
      created_date: string;
    }>;

    debug(MODULE_NAME, `部署一覧取得: ${rows.length}件`);

    return NextResponse.json({
      success: true,
      departments: rows,
    });
  } catch (err) {
    error(MODULE_NAME, '部署一覧取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '部署一覧の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}



