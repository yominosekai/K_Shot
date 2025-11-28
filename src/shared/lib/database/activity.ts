// ユーザーアクティビティ記録（日次アクティビティ）

import { getDatabase } from './db';
import { getJSTTodayString } from '../utils/timezone';
import { debug, error } from '../logger';

const MODULE_NAME = 'activity';

/**
 * 今日のアクティビティを記録（既に記録されている場合はスキップ）
 * @param userSid ユーザーSID
 * @returns 記録されたかどうか（既に記録されていた場合はfalse）
 */
export function recordUserActivity(userSid: string): boolean {
  try {
    const db = getDatabase();
    const today = getJSTTodayString(); // JST基準の今日の日付（YYYY-MM-DD）
    const now = new Date().toISOString();

    // 既に今日のアクティビティが記録されているかチェック
    const existing = db
      .prepare('SELECT date FROM user_activities WHERE date = ? AND user_sid = ?')
      .get(today, userSid) as { date: string } | undefined;

    if (existing) {
      debug(MODULE_NAME, `アクティビティは既に記録済み: userSid=${userSid}, date=${today}`);
      return false;
    }

    // 今日のアクティビティを記録
    db.prepare('INSERT INTO user_activities (date, user_sid, created_date) VALUES (?, ?, ?)').run(
      today,
      userSid,
      now
    );

    debug(MODULE_NAME, `アクティビティを記録: userSid=${userSid}, date=${today}`);
    return true;
  } catch (err: any) {
    // SQLITE_BUSYエラーの場合はリトライしない（1日1回の記録なので、次回に記録される）
    if (err.code === 'SQLITE_BUSY') {
      error(MODULE_NAME, `アクティビティ記録時にSQLITE_BUSYが発生（スキップ）: userSid=${userSid}`, err);
      return false;
    }
    error(MODULE_NAME, `アクティビティ記録エラー: userSid=${userSid}`, err);
    return false;
  }
}



