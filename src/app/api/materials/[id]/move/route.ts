// 資料移動API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail, getDrivePath } from '@/shared/lib/data-access/materials';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { logBusyError } from '@/shared/lib/database/busy-monitor';
import { readJSON, writeJSON } from '@/shared/lib/file-system/json';
import { DRIVE_CONFIG } from '@/config/drive';
import path from 'path';
import fs from 'fs/promises';

const MODULE_NAME = 'api/materials/[id]/move';

/**
 * PUT /api/materials/[id]/move
 * 資料を別のフォルダに移動
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: materialId } = params;
    const body = await request.json();
    const { target_folder_path } = body;

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    // 既存の資料を取得
    const existingMaterial = await getMaterialDetail(materialId);
    if (!existingMaterial) {
      return NextResponse.json(
        {
          success: false,
          error: '資料が見つかりません',
        },
        { status: 404 }
      );
    }

    const drivePath = getDrivePath();

    // 現在の資料ディレクトリパス
    let currentMaterialDir: string;
    if (existingMaterial.folder_path && existingMaterial.folder_path.trim() !== '') {
      const normalizedFolderPath = existingMaterial.folder_path.replace(/\//g, path.sep);
      currentMaterialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
    } else {
      currentMaterialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    const currentFullPath = path.join(drivePath, currentMaterialDir);

    // 移動先の資料ディレクトリパス
    let targetMaterialDir: string;
    const targetFolderPath = target_folder_path || '';
    if (targetFolderPath && targetFolderPath.trim() !== '') {
      const normalizedTargetPath = targetFolderPath.replace(/\//g, path.sep);
      targetMaterialDir = path.join('shared', 'shared_materials', 'folders', normalizedTargetPath, `material_${materialId}`);
    } else {
      targetMaterialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    const targetFullPath = path.join(drivePath, targetMaterialDir);

    // 同じ場所への移動は無視
    if (currentMaterialDir === targetMaterialDir) {
      return NextResponse.json({
        success: true,
        message: '既に同じ場所にあります',
        material: existingMaterial,
      });
    }

    // 現在のディレクトリの存在確認
    try {
      await fs.access(currentFullPath);
    } catch {
      error(MODULE_NAME, `現在の資料ディレクトリが見つかりません: ${currentFullPath}`);
      return NextResponse.json(
        {
          success: false,
          error: '現在の資料ディレクトリが見つかりません',
        },
        { status: 404 }
      );
    }

    // 移動先の親ディレクトリを作成（存在しない場合）
    const targetParentDir = path.dirname(targetFullPath);
    await fs.mkdir(targetParentDir, { recursive: true });
    debug(MODULE_NAME, `移動先ディレクトリ確認/作成: ${targetParentDir}`);

    // 移動先に既に同じ名前のディレクトリがある場合はエラー
    try {
      await fs.access(targetFullPath);
      error(MODULE_NAME, `移動先に既にディレクトリが存在します: ${targetFullPath}`);
      return NextResponse.json(
        {
          success: false,
          error: '移動先に既に同じ資料が存在します',
        },
        { status: 409 }
      );
    } catch {
      // 存在しない場合は問題なし
    }

    // ディレクトリを移動（リネーム）
    try {
      await fs.rename(currentFullPath, targetFullPath);
      debug(MODULE_NAME, `ディレクトリ移動: ${currentFullPath} -> ${targetFullPath}`);
    } catch (err) {
      error(MODULE_NAME, 'ディレクトリ移動エラー:', err);
      return NextResponse.json(
        {
          success: false,
          error: 'ディレクトリの移動に失敗しました',
        },
        { status: 500 }
      );
    }

    // metadata.jsonを更新
    const metadataPath = path.join(targetFullPath, 'metadata.json');
    try {
      const metadata = await readJSON(metadataPath);
      metadata.folder_path = targetFolderPath;
      metadata.updated_date = new Date().toISOString();
      await writeJSON(metadataPath, metadata);
      debug(MODULE_NAME, `metadata.json更新: ${metadataPath}`);
    } catch (err) {
      error(MODULE_NAME, 'metadata.json更新エラー:', err);
      // メタデータ更新に失敗しても続行（ディレクトリは移動済み）
    }

    // SQLiteを更新
    const db = getDatabase();
    const now = new Date().toISOString();
    const update = db.prepare(`
      UPDATE materials
      SET folder_path = ?, updated_date = ?
      WHERE id = ?
    `);

    // リトライ処理（最大5回、指数バックオフ）
    const maxRetries = 5;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        update.run(targetFolderPath, now, materialId);
        if (retryCount > 0) {
          debug(MODULE_NAME, `SQLite更新成功（リトライ ${retryCount}回後）: materialId=${materialId}`);
          // SQLITE_BUSYが発生したが最終的に成功した場合のログ
          const userSid = existingMaterial.created_by;
          if (userSid) {
            await logBusyError(userSid, 'moveMaterial', retryCount, true, { materialId, targetFolderPath });
          }
        } else {
          debug(MODULE_NAME, `SQLite更新: materialId=${materialId}`);
        }
        break;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 50 * retryCount;
          debug(MODULE_NAME, `SQLite書き込み競合検出（リトライ ${retryCount}回目）: materialId=${materialId}, ${waitTime}ms待機`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw err;
      }
    }

    if (retryCount >= maxRetries && lastError) {
      error(MODULE_NAME, `SQLite更新失敗（最大リトライ回数に達しました）: materialId=${materialId}`, lastError);
      // SQLITE_BUSYが発生して最終的に失敗した場合のログ
      const userSid = existingMaterial.created_by;
      if (userSid) {
        await logBusyError(userSid, 'moveMaterial', retryCount, false, { materialId, targetFolderPath });
      }
      throw lastError;
    }

    // 更新後の資料を取得
    const updatedMaterial = await getMaterialDetail(materialId);

    return NextResponse.json({
      success: true,
      message: '資料が正常に移動されました',
      material: updatedMaterial,
    });
  } catch (err) {
    error(MODULE_NAME, '資料移動エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '資料の移動に失敗しました',
      },
      { status: 500 }
    );
  }
}

