// スキル項目の関連資料一括取得API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { checkPermission } from '@/features/auth/utils';
import { getSkillPhaseItemsWithMaterials } from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/items/materials/batch';

/**
 * POST /api/skill-mapping/items/materials/batch
 * 複数のスキル項目の関連資料を一括取得（教育訓練権限必須）
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { skillPhaseItemIds } = body;

    if (!Array.isArray(skillPhaseItemIds)) {
      return NextResponse.json(
        { success: false, error: 'skillPhaseItemIdsは配列である必要があります' },
        { status: 400 }
      );
    }

    if (skillPhaseItemIds.length === 0) {
      return NextResponse.json({
        success: true,
        linkedItemIds: [],
      });
    }

    // 一度のSQLクエリで関連付けがあるスキル項目IDを取得
    const linkedItemIds = getSkillPhaseItemsWithMaterials(skillPhaseItemIds);

    debug(MODULE_NAME, `一括関連付けチェック: ${skillPhaseItemIds.length}件中${linkedItemIds.size}件に関連付けあり`);

    return NextResponse.json({
      success: true,
      linkedItemIds: Array.from(linkedItemIds),
    });
  } catch (err) {
    error(MODULE_NAME, '一括関連資料取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '一括関連資料の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

