// 通知関連の型定義

/**
 * 通知タイプ
 */
export type NotificationType = 'material_notification' | 'task_notification' | 'system_notification';

/**
 * 通知（データベースから取得）
 */
export interface Notification {
  id: string;
  user_sid: string;
  from_user_sid: string;
  material_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: number; // 0: 未読, 1: 既読
  created_date: string;
  read_date?: string;
}

/**
 * 通知（正規化後、フロントエンドで使用）
 */
export interface NotificationNormalized {
  id: string;
  user_sid: string;
  from_user_sid: string;
  from_user_name?: string; // 送信者名（結合後）
  material_id?: string;
  material_title?: string; // 資料タイトル（結合後）
  material_folder_path?: string; // 資料のフォルダパス（結合後）
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_date: string;
  read_date?: string;
}

