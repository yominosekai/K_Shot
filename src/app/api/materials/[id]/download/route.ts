import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { getDrivePath } from '@/shared/lib/data-access/materials';
import { info, error, debug } from '@/shared/lib/logger';
import path from 'path';
import fs from 'fs/promises';

const MODULE_NAME = 'api/materials/[id]/download';

/**
 * GET /api/materials/[id]/download
 * 添付ファイルをダウンロード
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'ファイル名が指定されていません' },
        { status: 400 }
      );
    }

    // 資料情報を取得
    const material = await getMaterialDetail(id);
    if (!material) {
      return NextResponse.json(
        { success: false, error: '資料が見つかりません' },
        { status: 404 }
      );
    }

    // 添付ファイルのパスを構築
    const drivePath = getDrivePath();
    let materialDir: string;
    if (material.folder_path && material.folder_path.trim() !== '') {
      const normalizedFolderPath = material.folder_path.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${id}`);
    } else {
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${id}`);
    }

    // filenameがrelativePathを含む場合（例: "images/logo.png"）を考慮
    // デコードしてからパスを構築
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(drivePath, materialDir, 'attachments', decodedFilename);

    // ファイルの存在確認
    try {
      await fs.access(filePath);
    } catch {
      error(MODULE_NAME, `ファイルが見つかりません: ${filePath}`);
      return NextResponse.json(
        { success: false, error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // ファイルを読み込み
    const fileBuffer = await fs.readFile(filePath);
    const safeFileName = encodeURIComponent(filename);

    // レスポンスヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
    headers.set('Content-Length', fileBuffer.length.toString());

    debug(MODULE_NAME, `ファイルダウンロード: ${filePath}`);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    error(MODULE_NAME, 'ダウンロードエラー:', err);
    return NextResponse.json(
      { success: false, error: 'ダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}


