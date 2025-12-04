// スキルマスタ個別管理API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/shared/lib/auth/middleware';
import {
  getSkillPhaseItem,
  updateSkillPhaseItem,
  deleteSkillPhaseItem,
} from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/items/[id]';

/**
 * GET /api/skill-mapping/items/[id]
 * 特定のスキルフェーズ項目を取得（認証必須）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: '無効なIDです' },
        { status: 400 }
      );
    }

    const item = getSkillPhaseItem(itemId);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'スキルフェーズ項目が見つかりませんでした' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (err) {
    error(MODULE_NAME, 'スキルフェーズ項目取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'スキルフェーズ項目の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/skill-mapping/items/[id]
 * スキルフェーズ項目を更新（教育訓練ロール以上）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 教育訓練ロール以上が必要
    const authResult = await requireRole('training');
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: '無効なIDです' },
        { status: 400 }
      );
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

    const success = updateSkillPhaseItem(
      itemId,
      category,
      item,
      subCategory,
      smallCategory,
      phase,
      name,
      description,
      displayOrder
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'スキルフェーズ項目の更新に失敗しました' },
        { status: 500 }
      );
    }

    const updatedItem = getSkillPhaseItem(itemId);

    debug(MODULE_NAME, `スキルフェーズ項目更新: id=${itemId}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (err) {
    error(MODULE_NAME, 'スキルフェーズ項目更新エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'スキルフェーズ項目の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/skill-mapping/items/[id]
 * スキルフェーズ項目を削除（教育訓練ロール以上）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 教育訓練ロール以上が必要
    const authResult = await requireRole('training');
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: '無効なIDです' },
        { status: 400 }
      );
    }

    const success = deleteSkillPhaseItem(itemId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'スキルフェーズ項目の削除に失敗しました' },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `スキルフェーズ項目削除: id=${itemId}`);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    error(MODULE_NAME, 'スキルフェーズ項目削除エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'スキルフェーズ項目の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

