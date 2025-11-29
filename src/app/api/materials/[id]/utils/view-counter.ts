// 閲覧数カウント処理

import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { logBusyError } from '@/shared/lib/database/busy-monitor';
import { recordMaterialViewActivityEvent } from '@/shared/lib/activity-log';

const MODULE_NAME = 'api/materials/[id]/utils/view-counter';

/**
 * 資料の閲覧数をカウント（重複防止付き）
 */
export async function incrementMaterialView(materialId: string, userId: string): Promise<void> {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

    // ログ用途では毎回記録（同一日・同一資料でも追記）
    recordMaterialViewActivityEvent(userId, materialId);

    // 今日既に閲覧しているかチェック
    const checkView = db.prepare(`
      SELECT * FROM material_views
      WHERE material_id = ? AND user_id = ? AND view_date = ?
    `);
    const existingView = checkView.get(materialId, userId, today);

    // 今日初めての閲覧の場合のみカウント
    if (!existingView) {
      // 閲覧履歴を追加
      const insertView = db.prepare(`
        INSERT INTO material_views (material_id, user_id, view_date)
        VALUES (?, ?, ?)
      `);

      // 資料の閲覧数を更新
      const updateViews = db.prepare(`
        UPDATE materials
        SET views = views + 1
        WHERE id = ?
      `);

      // トランザクションで実行
      const transaction = db.transaction(() => {
        insertView.run(materialId, userId, today);
        updateViews.run(materialId);
      });

      // リトライ処理（最大5回、指数バックオフ）
      const maxRetries = 5;
      let retryCount = 0;
      let lastError: any = null;

      while (retryCount < maxRetries) {
        try {
          transaction();
          if (retryCount > 0) {
            debug(
              MODULE_NAME,
              `閲覧数カウント成功（リトライ ${retryCount}回後）: materialId=${materialId}, userId=${userId}`
            );
            await logBusyError(userId, 'incrementMaterialView', retryCount, true, { materialId });
          } else {
            debug(MODULE_NAME, `閲覧数カウント: materialId=${materialId}, userId=${userId}`);
          }
          break;
        } catch (err: any) {
          lastError = err;
          if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
            retryCount++;
            const waitTime = 50 * retryCount;
            debug(
              MODULE_NAME,
              `SQLite書き込み競合検出（リトライ ${retryCount}回目）: materialId=${materialId}, ${waitTime}ms待機`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          // 閲覧数カウントのエラーは無視して続行（資料取得は成功させる）
          error(
            MODULE_NAME,
            `閲覧数カウントエラー（無視して続行）: materialId=${materialId}`,
            err
          );
          // SQLITE_BUSYが発生して最終的に失敗した場合のログ（エラーは無視するがログは残す）
          if (err.code === 'SQLITE_BUSY') {
            await logBusyError(userId, 'incrementMaterialView', retryCount, false, { materialId });
          }
          break;
        }
      }
    }
  } catch (viewErr) {
    // 閲覧数カウントのエラーは無視して続行
    error(MODULE_NAME, `閲覧数カウントエラー（無視して続行）: materialId=${materialId}`, viewErr);
  }
}

/**
 * 資料の最新の閲覧数を取得
 */
export function getMaterialViews(materialId: string): number {
  try {
    const db = getDatabase();
    const getViews = db.prepare(`
      SELECT views FROM materials WHERE id = ?
    `);
    const materialRow = getViews.get(materialId) as { views: number } | undefined;
    return materialRow?.views || 0;
  } catch (viewErr) {
    // 閲覧数取得のエラーは無視
    error(MODULE_NAME, `閲覧数取得エラー（無視）: materialId=${materialId}`, viewErr);
    return 0;
  }
}


