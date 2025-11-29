// ユーザーアクティビティ記録（日次アクティビティ）

import { getDatabase } from './db';
import { getJSTTodayString } from '../utils/timezone';
import { debug, error } from '../logger';

const MODULE_NAME = 'activity';

/**
 * 今日のアクティビティを記録（既に記録されている場合はスキップ）
 * @param userId ユーザーID（UUID）
 * @returns 記録されたかどうか（既に記録されていた場合はfalse）
 */
export function recordUserActivity(userId: string): boolean {
  try {
    const db = getDatabase();
    const today = getJSTTodayString(); // JST基準の今日の日付（YYYY-MM-DD）
    const now = new Date().toISOString();

    // 既に今日のアクティビティが記録されているかチェック
    const existing = db
      .prepare('SELECT date FROM user_activities WHERE date = ? AND user_id = ?')
      .get(today, userId) as { date: string } | undefined;

    if (existing) {
      debug(MODULE_NAME, `アクティビティは既に記録済み: userId=${userId}, date=${today}`);
      return false;
    }

    // 今日のアクティビティを記録
    db.prepare('INSERT INTO user_activities (date, user_id, created_date) VALUES (?, ?, ?)').run(
      today,
      userId,
      now
    );

    debug(MODULE_NAME, `アクティビティを記録: userId=${userId}, date=${today}`);
    return true;
  } catch (err: any) {
    // SQLITE_BUSYエラーの場合はリトライしない（1日1回の記録なので、次回に記録される）
    if (err.code === 'SQLITE_BUSY') {
      error(MODULE_NAME, `アクティビティ記録時にSQLITE_BUSYが発生（スキップ）: userId=${userId}`, err);
      return false;
    }
    error(MODULE_NAME, `アクティビティ記録エラー: userId=${userId}`, err);
    return false;
  }
}



