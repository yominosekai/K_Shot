// スキルマスタ管理API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/shared/lib/auth/middleware';
import {
  getSkillPhaseItems,
  getSkillPhaseItem,
  createSkillPhaseItem,
  updateSkillPhaseItem,
  deleteSkillPhaseItem,
} from '@/shared/lib/data-access/skill-mapping';
import { getDatabase } from '@/shared/lib/database/db';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/items';

/**
 * GET /api/skill-mapping/items
 * スキルマスタ一覧を取得（認証必須）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const items = getSkillPhaseItems();

    debug(MODULE_NAME, `スキルマスタ取得: ${items.length}件`);

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (err) {
    error(MODULE_NAME, 'スキルマスタ取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'スキルマスタの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skill-mapping/items
 * スキルフェーズ項目を追加（教育訓練ロール以上）
 */
export async function POST(request: NextRequest) {
  try {
    // 教育訓練ロール以上が必要
    const authResult = await requireRole('training');
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { category, item, subCategory, smallCategory, phase, name, description, displayOrder } = body;

    // バリデーション
    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'categoryが必要です' },
        { status: 400 }
      );
    }
    if (!item || typeof item !== 'string') {
      return NextResponse.json(
        { success: false, error: 'itemが必要です' },
        { status: 400 }
      );
    }
    if (!subCategory || typeof subCategory !== 'string') {
      return NextResponse.json(
        { success: false, error: 'subCategoryが必要です' },
        { status: 400 }
      );
    }
    if (!smallCategory || typeof smallCategory !== 'string') {
      return NextResponse.json(
        { success: false, error: 'smallCategoryが必要です' },
        { status: 400 }
      );
    }
    if (!phase || typeof phase !== 'number' || phase < 1 || phase > 5) {
      return NextResponse.json(
        { success: false, error: 'phaseは1〜5の数値が必要です' },
        { status: 400 }
      );
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'nameが必要です' },
        { status: 400 }
      );
    }

    const newItem = createSkillPhaseItem(
      category,
      item,
      subCategory,
      smallCategory,
      phase,
      name,
      description,
      displayOrder
    );

    if (!newItem) {
      return NextResponse.json(
        { success: false, error: 'スキルフェーズ項目の追加に失敗しました' },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `スキルフェーズ項目追加: id=${newItem.id}`);

    return NextResponse.json({
      success: true,
      item: newItem,
    });
  } catch (err) {
    error(MODULE_NAME, 'スキルフェーズ項目追加エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'スキルフェーズ項目の追加に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/skill-mapping/items
 * スキルマスタを一括更新（教育訓練ロール以上）
 */
export async function PUT(request: NextRequest) {
  try {
    // 教育訓練ロール以上が必要
    const authResult = await requireRole('training');
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'データは配列形式である必要があります' },
        { status: 400 }
      );
    }

    // 既存のデータを全て削除してから新しいデータを挿入
    // トランザクションで処理
    const db = getDatabase();
    
    const transaction = db.transaction(() => {
      // 既存のデータを全て削除
      db.prepare('DELETE FROM skill_phase_items').run();
      
      // 新しいデータを挿入
      const insert = db.prepare(`
        INSERT INTO skill_phase_items (
          category,
          item,
          sub_category,
          small_category,
          phase,
          name,
          description,
          display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      body.forEach((item: any) => {
        insert.run(
          item.category,
          item.item,
          item.subCategory || item.sub_category,
          item.smallCategory || item.small_category,
          item.phase,
          item.name,
          item.description || null,
          item.displayOrder || item.display_order || null
        );
      });
    });
    
    transaction();

    debug(MODULE_NAME, `スキルマスタ一括更新: ${body.length}件`);

    return NextResponse.json({
      success: true,
      message: `${body.length}件のデータを同期しました`,
    });
  } catch (err) {
    error(MODULE_NAME, 'スキルマスタ一括更新エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'スキルマスタの更新に失敗しました',
      },
      { status: 500 }
    );
  }
}
