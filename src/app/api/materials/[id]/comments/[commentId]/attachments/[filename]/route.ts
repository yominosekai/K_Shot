// コメント添付ファイルダウンロードAPI

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { DRIVE_CONFIG } from '@/config/drive';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/[id]/comments/[commentId]/attachments/[filename]';

/**
 * GET /api/materials/[id]/comments/[commentId]/attachments/[filename]
 * コメントの添付ファイルをダウンロード
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string; filename: string }> }
) {
  try {
    const { id: materialId, commentId, filename } = await params;

    if (!materialId || !commentId || !filename) {
      return NextResponse.json(
        { success: false, error: 'パラメータが不足しています' },
        { status: 400 }
      );
    }

    // 資料情報を取得（パス構築のため）
    const material = await getMaterialDetail(materialId);
    if (!material) {
      return NextResponse.json(
        { success: false, error: '資料が見つかりません' },
        { status: 404 }
      );
    }

    const drivePath = DRIVE_CONFIG.DATA_DIR;
    const folderPath = material.folder_path || '';

    // コメント添付ファイルのパスを構築
    let materialDir: string;
    if (folderPath && folderPath.trim() !== '') {
      const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
    } else {
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    const filePath = path.join(drivePath, materialDir, 'comments', commentId, 'attachments', filename);

    // ファイルを読み込む
    const fileBuffer = await readFile(filePath);

    // ファイル名を安全にする（URLエンコード）
    const safeFilename = encodeURIComponent(filename);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'ファイルダウンロードエラー:', err);
    return NextResponse.json(
      { success: false, error: 'ファイルのダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}

