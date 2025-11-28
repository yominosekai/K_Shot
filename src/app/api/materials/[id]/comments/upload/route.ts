// コメント添付ファイルアップロードAPI

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { DRIVE_CONFIG } from '@/config/drive';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/[id]/comments/upload';

/**
 * POST /api/materials/[id]/comments/upload
 * コメントの添付ファイルをアップロード
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const formData = await request.formData();

    const commentId = formData.get('comment_id') as string;
    const files = formData.getAll('files') as File[];

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'コメントIDが指定されていません' },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ファイルが指定されていません' },
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

    // コメント添付ファイルの保存先パスを構築
    let materialDir: string;
    if (folderPath && folderPath.trim() !== '') {
      const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
    } else {
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    // コメント添付ファイル用ディレクトリ
    const commentsDir = path.join(drivePath, materialDir, 'comments', commentId, 'attachments');
    await mkdir(commentsDir, { recursive: true });

    const attachmentList: Array<{
      filename: string;
      original_filename?: string;
      size: number;
      type: string;
      relativePath?: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // ファイル名を安全にする
      const sanitizeFileName = (fileName: string): string => {
        return fileName
          .replace(/[<>:"|?*\\\/]/g, '_')
          .replace(/[\x00-\x1F]/g, '_')
          .replace(/^\.+/, '')
          .replace(/\.+$/, '')
          .replace(/^ +| +$/g, '')
          .replace(/\.\.+/g, '.')
          .trim();
      };

      let safeFileName = sanitizeFileName(file.name);
      if (!safeFileName || safeFileName.length === 0) {
        const ext = path.extname(file.name) || '';
        safeFileName = `file_${i + 1}${ext}`;
      }

      // ファイルのバイトデータを取得
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 保存先パス
      const filePath = path.join(commentsDir, safeFileName);

      await writeFile(filePath, buffer);
      debug(MODULE_NAME, `コメント添付ファイル保存: ${filePath}`);

      attachmentList.push({
        filename: safeFileName,
        original_filename: file.name,
        size: file.size,
        type: file.type,
      });
    }

    return NextResponse.json({
      success: true,
      attachments: attachmentList,
    });
  } catch (err) {
    error(MODULE_NAME, 'コメント添付ファイルアップロードエラー:', err);
    return NextResponse.json(
      { success: false, error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

