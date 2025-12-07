// 資料に関連するスキル項目取得API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { getMaterialSkillPhaseItems, getSkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/[id]/skills';

/**
 * GET /api/materials/:id/skills
 * 資料に関連するスキル項目を取得（認証必須）
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

    // 関連するスキル項目IDを取得
    const skillPhaseItemIds = getMaterialSkillPhaseItems(id);

    // スキル項目の詳細情報を取得
    const skillPhaseItems = skillPhaseItemIds
      .map((itemId) => getSkillPhaseItem(itemId))
      .filter((item) => item !== null);

    debug(MODULE_NAME, `関連スキル項目取得: materialId=${id}, ${skillPhaseItems.length}件`);

    return NextResponse.json({
      success: true,
      skillPhaseItems,
    });
  } catch (err) {
    error(MODULE_NAME, '関連スキル項目取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '関連スキル項目の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

