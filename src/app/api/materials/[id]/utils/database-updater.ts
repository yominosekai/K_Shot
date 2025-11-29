// データベース更新処理

import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { logBusyError } from '@/shared/lib/database/busy-monitor';

const MODULE_NAME = 'api/materials/[id]/utils/database-updater';

/**
 * SQLiteで資料を更新（リトライ処理付き）
 */
export async function updateMaterialInDatabase(
  materialId: string,
  userId: string,
  updateParams: {
    title: string;
    description: string | null;
    category_id: string | null;
    type: string;
    difficulty: string | null;
    estimated_hours: number | null;
    tags: string;
    folderPath: string;
    now: string;
  }
): Promise<void> {
  const db = getDatabase();
  const update = db.prepare(`
    UPDATE materials
    SET title = ?, description = ?, category_id = ?, type = ?, difficulty = ?,
        estimated_hours = ?, tags = ?, folder_path = ?, updated_date = ?
    WHERE id = ?
  `);
  
  const params = [
    updateParams.title,
    updateParams.description,
    updateParams.category_id,
    updateParams.type,
    updateParams.difficulty,
    updateParams.estimated_hours,
    updateParams.tags,
    updateParams.folderPath,
    updateParams.now,
    materialId,
  ];
  
  // リトライ処理（最大5回、指数バックオフ）
  const maxRetries = 5;
  let retryCount = 0;
  let lastError: any = null;
  
  while (retryCount < maxRetries) {
    try {
      update.run(...params);
      if (retryCount > 0) {
        debug(MODULE_NAME, `SQLite更新成功（リトライ ${retryCount}回後）: materialId=${materialId}`);
        await logBusyError(userId, 'updateMaterial', retryCount, true, { materialId, title: updateParams.title });
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
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
  
  if (retryCount >= maxRetries && lastError) {
    error(MODULE_NAME, `SQLite更新失敗（最大リトライ回数に達しました）: materialId=${materialId}`, lastError);
    await logBusyError(userId, 'updateMaterial', retryCount, false, { materialId, title: updateParams.title });
    throw lastError;
  }
}


