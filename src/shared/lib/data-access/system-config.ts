// システム設定データアクセス層

import { getDatabase } from '../database/db';
import { info, error, debug } from '../logger';
import { logBusyError } from '../database/busy-monitor';

const MODULE_NAME = 'system-config';

/**
 * システム設定を取得
 */
export function getSystemConfig(key: string): string | null {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || null;
  } catch (err) {
    error(MODULE_NAME, `getSystemConfigエラー: key=${key}`, err);
    return null;
  }
}

/**
 * システム設定を保存
 */
export async function setSystemConfig(key: string, value: string, updatedBy?: string): Promise<boolean> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO system_config (key, value, updated_date, updated_by)
      VALUES (?, ?, ?, ?)
    `);

    const maxRetries = 5;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        insert.run(key, value, now, updatedBy || null);
        if (retryCount > 0) {
          debug(MODULE_NAME, `システム設定保存成功（リトライ ${retryCount}回後）: key=${key}`);
          // SQLITE_BUSYが発生したが最終的に成功した場合のログ
          if (updatedBy) {
            await logBusyError(updatedBy, 'setSystemConfig', retryCount, true, { key });
          }
        } else {
          debug(MODULE_NAME, `システム設定保存: key=${key}`);
        }
        return true;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 50 * retryCount;
          debug(MODULE_NAME, `SQLite書き込み競合検出（リトライ ${retryCount}回目）: key=${key}, ${waitTime}ms待機`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw err;
      }
    }

    if (retryCount >= maxRetries && lastError) {
      error(MODULE_NAME, `システム設定保存失敗（最大リトライ回数に達しました）: key=${key}`, lastError);
      // SQLITE_BUSYが発生して最終的に失敗した場合のログ
      if (updatedBy) {
        await logBusyError(updatedBy, 'setSystemConfig', retryCount, false, { key });
      }
      throw lastError;
    }

    return true;
  } catch (err) {
    error(MODULE_NAME, `setSystemConfigエラー: key=${key}`, err);
    return false;
  }
}

