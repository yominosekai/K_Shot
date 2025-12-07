// 複数資料の関連スキル項目一括取得API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { getMaterialsSkillPhaseItems } from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/skills/batch';

/**
 * POST /api/materials/skills/batch
 * 複数の資料に関連するスキル項目を一括取得（認証必須）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { materialIds } = body;

    if (!Array.isArray(materialIds)) {
      return NextResponse.json(
        { success: false, error: 'materialIdsは配列である必要があります' },
        { status: 400 }
      );
    }

    if (materialIds.length === 0) {
      return NextResponse.json({
        success: true,
        skillPhaseItemIds: [],
      });
    }

    // 一度のSQLクエリで関連付けがあるスキル項目IDを取得
    const skillPhaseItemIds = getMaterialsSkillPhaseItems(materialIds);

    debug(MODULE_NAME, `一括関連スキル項目取得: materialIds=${materialIds.length}件, ${skillPhaseItemIds.size}件のスキル項目に関連付けあり`);

    return NextResponse.json({
      success: true,
      skillPhaseItemIds: Array.from(skillPhaseItemIds),
    });
  } catch (err) {
    error(MODULE_NAME, '一括関連スキル項目取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '一括関連スキル項目の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

