// スキル項目と資料の関連付け解除API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { checkPermission } from '@/features/auth/utils';
import { unlinkSkillPhaseItemFromMaterial } from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/items/[id]/materials/[materialId]';

/**
 * DELETE /api/skill-mapping/items/:id/materials/:materialId
 * スキル項目と資料の関連付けを解除（教育訓練権限必須）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
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

    const { id, materialId } = await params;
    const skillPhaseItemId = parseInt(id, 10);

    if (isNaN(skillPhaseItemId)) {
      return NextResponse.json(
        { success: false, error: '無効なスキル項目IDです' },
        { status: 400 }
      );
    }

    const success = unlinkSkillPhaseItemFromMaterial(skillPhaseItemId, materialId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '関連付けの解除に失敗しました' },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `関連付け解除: itemId=${skillPhaseItemId}, materialId=${materialId}`);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    error(MODULE_NAME, '関連付け解除エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '関連付けの解除に失敗しました',
      },
      { status: 500 }
    );
  }
}

