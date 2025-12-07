// 資料とスキル項目の関連付けAPI

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { checkPermission } from '@/features/auth/utils';
import { toggleSkillPhaseItemMaterialLink } from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/[id]/skills/[skillPhaseItemId]';

/**
 * POST /api/materials/:id/skills/:skillPhaseItemId
 * 資料とスキル項目を関連付け/解除（トグル）（教育訓練権限必須）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillPhaseItemId: string }> }
) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    // 教育訓練権限チェック
    if (!checkPermission(authResult.user, 'training')) {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      );
    }

    const { id, skillPhaseItemId } = await params;
    const skillPhaseItemIdNum = parseInt(skillPhaseItemId, 10);

    if (isNaN(skillPhaseItemIdNum)) {
      return NextResponse.json(
        { success: false, error: '無効なスキル項目IDです' },
        { status: 400 }
      );
    }

    const result = toggleSkillPhaseItemMaterialLink(skillPhaseItemIdNum, id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: '関連付けの更新に失敗しました' },
        { status: 500 }
      );
    }

    debug(
      MODULE_NAME,
      `関連付けトグル: materialId=${id}, itemId=${skillPhaseItemIdNum}, linked=${result.linked}`
    );

    return NextResponse.json({
      success: true,
      linked: result.linked,
    });
  } catch (err) {
    error(MODULE_NAME, '関連付けトグルエラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '関連付けの更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

