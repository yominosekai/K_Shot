// カテゴリAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/shared/lib/data-access/materials';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/categories';

/**
 * GET /api/materials/categories
 * カテゴリ一覧を取得
 */
export async function GET() {
  try {
    const categories = await getCategories();

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (err) {
    console.error('[API] /api/materials/categories GET エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'カテゴリの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/categories
 * カテゴリを追加
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, parent_id } = body;

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'カテゴリ名は必須です' },
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

    // 重複チェック（同じ名前のカテゴリが同じ親の下に存在するか）
    const parentId = parent_id || '';
    const existing = db.prepare('SELECT id FROM categories WHERE name = ? AND parent_id = ?').get(name.trim(), parentId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: '同じ名前のカテゴリが既に存在します' },
        { status: 400 }
      );
    }

    // 親カテゴリのlevelを取得（親がない場合は0）
    let level = 1;
    if (parentId) {
      const parent = db.prepare('SELECT level FROM categories WHERE id = ?').get(parentId) as { level: number } | undefined;
      if (parent) {
        level = parent.level + 1;
      } else {
        return NextResponse.json(
          { success: false, error: '親カテゴリが見つかりません' },
          { status: 400 }
        );
      }
    }

    // カテゴリを追加
    // IDは数値文字列（連番）で生成（既存のデフォルトカテゴリと一貫性を保つため）
    const existingCategories = db.prepare('SELECT id FROM categories').all() as Array<{ id: string }>;
    let maxId = 0;
    for (const cat of existingCategories) {
      const numId = parseInt(cat.id, 10);
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    }
    const id = String(maxId + 1);
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO categories (id, name, description, parent_id, level, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), description?.trim() || null, parentId, level, now);

    debug(MODULE_NAME, `カテゴリ追加: id=${id}, name=${name}, parent_id=${parentId}, level=${level}`);

    return NextResponse.json({
      success: true,
      category: {
        id,
        name: name.trim(),
        description: description?.trim() || '',
        parent_id: parentId,
        level,
        created_date: now,
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'カテゴリ追加エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'カテゴリの追加に失敗しました',
      },
      { status: 500 }
    );
  }
}

