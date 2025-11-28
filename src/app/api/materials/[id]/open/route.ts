import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { getDrivePath } from '@/shared/lib/data-access/materials';
import { info, error, debug } from '@/shared/lib/logger';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const MODULE_NAME = 'api/materials/[id]/open';

/**
 * GET /api/materials/[id]/open
 * 添付ファイルを開く（Windowsのデフォルトアプリで開く）
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

    // PowerShellでファイルを開く（セキュリティのためパスをエスケープ）
    const escapedPath = filePath.replace(/'/g, "''");
    const command = `powershell -Command "Start-Process '${escapedPath}'"`;

    debug(MODULE_NAME, `ファイルを開く: ${filePath}`);

    try {
      await execAsync(command);
      debug(MODULE_NAME, `ファイルを開きました: ${filePath}`);
      return NextResponse.json({
        success: true,
        message: 'ファイルを開きました',
        filePath: filePath,
      });
    } catch (err: any) {
      error(MODULE_NAME, `ファイルを開くエラー:`, err);
      return NextResponse.json(
        { success: false, error: `ファイルを開けませんでした: ${err.message}` },
        { status: 500 }
      );
    }
  } catch (err) {
    error(MODULE_NAME, 'エラー:', err);
    return NextResponse.json(
      { success: false, error: 'ファイルを開けませんでした' },
      { status: 500 }
    );
  }
}


