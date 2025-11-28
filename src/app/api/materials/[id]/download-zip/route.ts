// 資料全体をZIPでダウンロードするAPI

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail, getDrivePath } from '@/shared/lib/data-access/materials';
import { info, error, debug } from '@/shared/lib/logger';
import path from 'path';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';

const MODULE_NAME = 'api/materials/[id]/download-zip';

/**
 * GET /api/materials/[id]/download-zip
 * 資料全体をZIPファイルとしてダウンロード
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

    // ディレクトリの存在確認
    try {
      await fs.access(fullMaterialDir);
    } catch {
      error(MODULE_NAME, `資料ディレクトリが見つかりません: ${fullMaterialDir}`);
      return NextResponse.json(
        {
          success: false,
          error: '資料ディレクトリが見つかりません',
        },
        { status: 404 }
      );
    }

    // ZIPファイルを作成
    const zip = new AdmZip();
    const zipFileName = `${material.title || `material_${materialId}`}.zip`.replace(/[<>:"|?*\\\/]/g, '_');

    // ディレクトリ内のファイルを再帰的に追加
    const addDirectoryToZip = async (dirPath: string, zipPath: string = '') => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = zipPath ? path.join(zipPath, entry.name) : entry.name;

          if (entry.isDirectory()) {
            // ディレクトリの場合は再帰的に処理
            await addDirectoryToZip(fullPath, relativePath);
          } else {
            // ファイルの場合はZIPに追加
            try {
              const fileBuffer = await fs.readFile(fullPath);
              zip.addFile(relativePath, fileBuffer);
              debug(MODULE_NAME, `ZIPに追加: ${relativePath}`);
            } catch (fileErr) {
              error(MODULE_NAME, `ファイル読み込みエラー: ${fullPath}`, fileErr);
              // ファイル読み込みに失敗しても続行
            }
          }
        }
      } catch (dirErr) {
        error(MODULE_NAME, `ディレクトリ読み込みエラー: ${dirPath}`, dirErr);
      }
    };

    // 資料ディレクトリ内のすべてのファイルをZIPに追加
    await addDirectoryToZip(fullMaterialDir);

    // ZIPファイルをバッファとして生成
    const zipBuffer = zip.toBuffer();

    // 安全なファイル名を作成（2バイト文字をエンコード）
    const safeFileName = encodeURIComponent(zipFileName);

    // レスポンスヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
    headers.set('Content-Length', zipBuffer.length.toString());

    debug(MODULE_NAME, `ZIPダウンロード完了: ${zipFileName} (${zipBuffer.length} bytes)`);
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers,
    });
  } catch (err) {
    error(MODULE_NAME, 'ZIPダウンロードエラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ZIPファイルの作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

