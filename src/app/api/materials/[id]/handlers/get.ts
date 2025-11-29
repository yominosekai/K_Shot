// GET処理: 資料の詳細を取得

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { error } from '@/shared/lib/logger';
import { incrementMaterialView, getMaterialViews } from '../utils/view-counter';

const MODULE_NAME = 'api/materials/[id]/handlers/get';

/**
 * GET /api/materials/[id]
 * 資料の詳細を取得（閲覧数を自動カウント）
 */
export async function handleGet(
  request: NextRequest,
  materialId: string
): Promise<NextResponse> {
  try {
    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id'); // オプション: ユーザーID

    const material = await getMaterialDetail(materialId);

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: '資料が見つかりません',
        },
        { status: 404 }
      );
    }

    // 閲覧数をカウント（ユーザーIDが指定されている場合のみ、重複防止）
    if (user_id) {
      await incrementMaterialView(materialId, user_id);
    }

    // 最新の閲覧数を取得（カウント後）
    material.views = getMaterialViews(materialId);

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (err) {
    error(MODULE_NAME, '資料取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '資料の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}


