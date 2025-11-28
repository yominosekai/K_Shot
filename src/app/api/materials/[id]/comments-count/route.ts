// 資料コメント数取得API

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialCommentCount } from '@/shared/lib/data-access/comments';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/[id]/comments-count';

/**
 * GET /api/materials/[id]/comments-count
 * 資料のコメント数を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;

    if (!materialId) {
      return NextResponse.json(
        { success: false, error: '資料IDが指定されていません' },
        { status: 400 }
      );
    }

    const count = getMaterialCommentCount(materialId);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      { success: false, error: 'コメント数の取得に失敗しました' },
      { status: 500 }
    );
  }
}

