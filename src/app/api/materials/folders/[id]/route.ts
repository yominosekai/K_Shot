// フォルダ管理API Route

import { NextRequest, NextResponse } from 'next/server';
import { updateFolderName } from '@/shared/lib/data-access/folders';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/folders/[id]';

/**
 * PUT /api/materials/folders/[id]
 * フォルダ名を変更
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const folderId = id;
    const body = await request.json();
    const { name } = body;

    if (!folderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'フォルダIDが指定されていません',
        },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'フォルダ名が指定されていません',
        },
        { status: 400 }
      );
    }

    const updatedFolder = await updateFolderName(folderId, name);

    if (!updatedFolder) {
      return NextResponse.json(
        {
          success: false,
          error: 'フォルダ名の変更に失敗しました',
        },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `フォルダ名を変更: folderId=${folderId}, name=${name}`);
    return NextResponse.json({
      success: true,
      folder: updatedFolder,
    });
  } catch (err) {
    error(MODULE_NAME, 'フォルダ名変更エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'フォルダ名の変更に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/folders/[id]
 * フォルダを削除（既存の実装を保持）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // TODO: SQLiteベースの実装に更新
  return NextResponse.json(
    {
      success: false,
      error: 'フォルダ削除は未実装です（ゴミ箱機能を使用してください）',
    },
    { status: 501 }
  );
}

