// 資料ファイル情報取得API

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail, getDrivePath } from '@/shared/lib/data-access/materials';
import { info, error } from '@/shared/lib/logger';
import path from 'path';
import fs from 'fs/promises';

const MODULE_NAME = 'api/materials/[id]/info';

/**
 * ディレクトリのサイズを再帰的に計算
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          totalSize += await getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      } catch (err) {
        // ファイルアクセスエラーは無視して続行
        error(MODULE_NAME, `ファイルサイズ取得エラー: ${fullPath}`, err);
      }
    }
  } catch (err) {
    error(MODULE_NAME, `ディレクトリ読み込みエラー: ${dirPath}`, err);
  }
  return totalSize;
}

/**
 * ファイルのサイズを取得
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * GET /api/materials/[id]/info
 * 資料のファイル情報を取得（ファイルサイズ、物理パスなど）
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: materialId } = params;

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    // 資料情報を取得
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

    const drivePath = getDrivePath();

    // 資料ディレクトリのパスを構築
    let materialDir: string;
    if (material.folder_path && material.folder_path.trim() !== '') {
      const normalizedFolderPath = material.folder_path.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
    } else {
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    const fullMaterialDir = path.join(drivePath, materialDir);
    const documentPath = path.join(fullMaterialDir, 'document.md');
    const attachmentsDir = path.join(fullMaterialDir, 'attachments');

    // ディレクトリの存在確認
    let totalSize = 0;
    let documentSize = 0;
    let attachmentsSize = 0;
    let attachmentsCount = 0;

    try {
      await fs.access(fullMaterialDir);

      // 全体のサイズを計算
      totalSize = await getDirectorySize(fullMaterialDir);

      // document.mdのサイズ
      documentSize = await getFileSize(documentPath);

      // 添付ファイルのサイズと数を計算
      try {
        await fs.access(attachmentsDir);
        const attachmentFiles = await fs.readdir(attachmentsDir, { withFileTypes: true });
        for (const file of attachmentFiles) {
          if (file.isFile()) {
            const filePath = path.join(attachmentsDir, file.name);
            const fileSize = await getFileSize(filePath);
            attachmentsSize += fileSize;
            attachmentsCount++;
          }
        }
      } catch {
        // attachmentsディレクトリが存在しない場合は0
      }
    } catch {
      // ディレクトリが存在しない場合はすべて0
    }

    // 物理パス（フルパス）
    const physicalPath = fullMaterialDir;

    return NextResponse.json({
      success: true,
      info: {
        totalSize,
        documentSize,
        attachmentsSize,
        attachmentsCount,
        physicalPath,
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'ファイル情報取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ファイル情報の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

