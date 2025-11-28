// 難易度API Routes

import { NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/difficulties';

/**
 * GET /api/materials/difficulties
 * 難易度一覧を取得
 */
export async function GET() {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM difficulty_levels ORDER BY sort_order, name').all() as any[];

    const difficulties = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      sort_order: row.sort_order || 0,
      created_date: row.created_date,
    }));

    debug(MODULE_NAME, `難易度一覧取得: ${difficulties.length}件`);
    return NextResponse.json({
      success: true,
      difficulties,
    });
  } catch (err) {
    error(MODULE_NAME, '難易度取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '難易度の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

