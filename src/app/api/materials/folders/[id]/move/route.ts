// フォルダ移動API Route

import { NextRequest, NextResponse } from 'next/server';
import { moveFolder } from '@/shared/lib/data-access/folders';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/folders/[id]/move';

/**
 * PUT /api/materials/folders/[id]/move
 * フォルダを別の親フォルダに移動
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const folderId = id;
    const body = await request.json();
    const { target_parent_id } = body;

    if (!folderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'フォルダIDが指定されていません',
        },
        { status: 400 }
      );
    }

    // target_parent_idは空文字列（ルート）も許可
    const targetParentId = target_parent_id === undefined ? '' : (target_parent_id || '');

    const movedFolder = await moveFolder(folderId, targetParentId);

    if (!movedFolder) {
      return NextResponse.json(
        {
          success: false,
          error: 'フォルダの移動に失敗しました',
        },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `フォルダを移動: folderId=${folderId}, targetParentId=${targetParentId}`);
    return NextResponse.json({
      success: true,
      folder: movedFolder,
    });
  } catch (err) {
    error(MODULE_NAME, 'フォルダ移動エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'フォルダの移動に失敗しました',
      },
      { status: 500 }
    );
  }
}

