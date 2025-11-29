// 通知データアクセス層

import { getDatabase } from '../database/db';
import { info, error, debug } from '../logger';
import type { Notification, NotificationNormalized } from '@/features/notifications/types';

const MODULE_NAME = 'notifications';

/**
 * 通知を作成
 */
export async function createNotification(
  userId: string,
  fromUserId: string,
  materialId: string | null,
  title: string,
  message: string,
  type: string = 'material_notification'
): Promise<Notification | null> {
  try {
    const db = getDatabase();
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdDate = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO notifications (
        id, user_id, from_user_id, material_id, type, title, message, is_read, created_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    insert.run(notificationId, userId, fromUserId, materialId || null, type, title, message, createdDate);

    debug(MODULE_NAME, `通知作成: id=${notificationId}, user_id=${userId}, from_user_id=${fromUserId}`);

    return {
      id: notificationId,
      user_id: userId,
      from_user_id: fromUserId,
      material_id: materialId || undefined,
      type: type as any,
      title,
      message,
      is_read: 0,
      created_date: createdDate,
    };
  } catch (err) {
    error(MODULE_NAME, '通知作成エラー:', err);
    return null;
  }
}

/**
 * 複数のユーザーに通知を作成（一括）
 */
export async function createNotificationsForUsers(
  userIds: string[],
  fromUserId: string,
  materialId: string | null,
  title: string,
  message: string,
  type: string = 'material_notification'
): Promise<number> {
  try {
    const db = getDatabase();
    const createdDate = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO notifications (
        id, user_id, from_user_id, material_id, type, title, message, is_read, created_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    let successCount = 0;
    for (const userId of userIds) {
      try {
        const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        insert.run(notificationId, userId, fromUserId, materialId || null, type, title, message, createdDate);
        successCount++;
      } catch (err) {
        error(MODULE_NAME, `通知作成エラー（個別）: user_id=${userId}`, err);
      }
    }

    debug(MODULE_NAME, `一括通知作成完了: ${successCount}/${userIds.length}件成功`);
    return successCount;
  } catch (err) {
    error(MODULE_NAME, '一括通知作成エラー:', err);
    return 0;
  }
}

/**
 * ユーザーの通知一覧を取得
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<NotificationNormalized[]> {
  try {
    const db = getDatabase();

    let query = `
      SELECT 
        n.*,
        u_from.display_name as from_user_name,
        m.title as material_title,
        m.folder_path as material_folder_path
      FROM notifications n
      LEFT JOIN users u_from ON n.from_user_id = u_from.id
      LEFT JOIN materials m ON n.material_id = m.id
      WHERE n.user_id = ?
    `;

    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND n.is_read = 0';
    }

    query += ' ORDER BY n.created_date DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      from_user_id: row.from_user_id,
      from_user_name: row.from_user_name || undefined,
      material_id: row.material_id || undefined,
      material_title: row.material_title || undefined,
      material_folder_path: row.material_folder_path || undefined,
      type: row.type as NotificationNormalized['type'],
      title: row.title,
      message: row.message,
      is_read: row.is_read === 1,
      created_date: row.created_date,
      read_date: row.read_date || undefined,
    }));
  } catch (err) {
    error(MODULE_NAME, `通知取得エラー: user_id=${userId}`, err);
    return [];
  }
}

/**
 * ユーザーの未読通知数を取得
 */
export function getUnreadNotificationCount(userId: string): number {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `);
    const result = stmt.get(userId) as { count: number } | undefined;
    return result?.count || 0;
  } catch (err) {
    // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return 0;
    }
    error(MODULE_NAME, `未読通知数取得エラー: user_id=${userId}`, err);
    return 0;
  }
}

/**
 * 通知を既読にする
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const db = getDatabase();
    const readDate = new Date().toISOString();

    const update = db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_date = ?
      WHERE id = ? AND user_id = ?
    `);

    const result = update.run(readDate, notificationId, userId);

    if (result.changes > 0) {
      debug(MODULE_NAME, `通知を既読に: id=${notificationId}, user_id=${userId}`);
      return true;
    }

    return false;
  } catch (err) {
    error(MODULE_NAME, `通知既読エラー: id=${notificationId}`, err);
    return false;
  }
}

/**
 * すべての通知を既読にする
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const db = getDatabase();
    const readDate = new Date().toISOString();

    const update = db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_date = ?
      WHERE user_id = ? AND is_read = 0
    `);

    const result = update.run(readDate, userId);

    debug(MODULE_NAME, `すべての通知を既読に: user_id=${userId}, ${result.changes}件`);
    return true;
  } catch (err) {
    error(MODULE_NAME, `全通知既読エラー: user_id=${userId}`, err);
    return false;
  }
}

/**
 * 通知を未読に戻す
 */
export async function markNotificationAsUnread(notificationId: string, userId: string): Promise<boolean> {
  try {
    const db = getDatabase();

    const update = db.prepare(`
      UPDATE notifications
      SET is_read = 0, read_date = NULL
      WHERE id = ? AND user_id = ?
    `);

    const result = update.run(notificationId, userId);

    if (result.changes > 0) {
      debug(MODULE_NAME, `通知を未読に戻す: id=${notificationId}, user_id=${userId}`);
      return true;
    }

    return false;
  } catch (err) {
    error(MODULE_NAME, `通知未読戻しエラー: id=${notificationId}`, err);
    return false;
  }
}

/**
 * 通知を削除（個別）
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const db = getDatabase();

    const deleteStmt = db.prepare(`
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
    `);

    const result = deleteStmt.run(notificationId, userId);

    if (result.changes > 0) {
      debug(MODULE_NAME, `通知を削除: id=${notificationId}, user_id=${userId}`);
      return true;
    }

    return false;
  } catch (err) {
    error(MODULE_NAME, `通知削除エラー: id=${notificationId}`, err);
    return false;
  }
}

/**
 * すべての通知を削除
 */
export async function deleteAllNotifications(userId: string): Promise<number> {
  try {
    const db = getDatabase();

    const deleteStmt = db.prepare(`
      DELETE FROM notifications
      WHERE user_id = ?
    `);

    const result = deleteStmt.run(userId);

    debug(MODULE_NAME, `すべての通知を削除: user_id=${userId}, ${result.changes}件`);
    return result.changes;
  } catch (err) {
    error(MODULE_NAME, `全通知削除エラー: user_id=${userId}`, err);
    return 0;
  }
}

