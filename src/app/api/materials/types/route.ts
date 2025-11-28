// 資料タイプAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/types';

/**
 * GET /api/materials/types
 * 資料タイプ一覧を取得
 */
export async function GET() {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM material_types ORDER BY sort_order, name').all() as any[];

    const types = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      sort_order: row.sort_order || 0,
      created_date: row.created_date,
    }));

    debug(MODULE_NAME, `資料タイプ一覧取得: ${types.length}件`);
    return NextResponse.json({
      success: true,
      types,
    });
  } catch (err) {
    error(MODULE_NAME, '資料タイプ取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '資料タイプの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/types
 * 資料タイプを追加
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '名前は必須です' },
        { status: 400 }
      );
    }

    // 不正な文字列チェック（SQLインジェクション対策）
    const dangerousPatterns = /[;'\"\\<>]/;
    if (dangerousPatterns.test(name) || (description && dangerousPatterns.test(description))) {
      return NextResponse.json(
        { success: false, error: '使用できない文字が含まれています' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 重複チェック
    const existing = db.prepare('SELECT id FROM material_types WHERE name = ?').get(name);
    if (existing) {
      return NextResponse.json(
        { success: false, error: '同じ名前のタイプが既に存在します' },
        { status: 400 }
      );
    }

    // 最大のsort_orderを取得
    const maxSortOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM material_types').get() as { max_order: number | null };
    const nextSortOrder = (maxSortOrder.max_order ?? 0) + 1;

    // タイプを追加
    // IDは連番で生成（categoriesと同じ方式）
    const existingTypes = db.prepare('SELECT id FROM material_types').all() as Array<{ id: string }>;
    let maxId = 0;
    for (const type of existingTypes) {
      const numId = parseInt(type.id, 10);
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    }
    const id = String(maxId + 1);
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO material_types (id, name, description, sort_order, created_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), description?.trim() || null, nextSortOrder, now);

    debug(MODULE_NAME, `資料タイプ追加: id=${id}, name=${name}`);

    return NextResponse.json({
      success: true,
      type: {
        id,
        name: name.trim(),
        description: description?.trim() || '',
        sort_order: nextSortOrder,
        created_date: now,
      },
    });
  } catch (err) {
    error(MODULE_NAME, '資料タイプ追加エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '資料タイプの追加に失敗しました',
      },
      { status: 500 }
    );
  }
}

