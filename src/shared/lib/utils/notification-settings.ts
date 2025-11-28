// 通知設定ユーティリティ（localStorage使用）

const NOTIFICATION_INTERVAL_KEY = 'notification_polling_interval';
const BACKGROUND_NOTIFICATION_KEY = 'background_notification_enabled';

export type NotificationInterval = 'immediate' | '1' | '5' | '10' | '30';

export interface NotificationIntervalOption {
  value: NotificationInterval;
  label: string;
  minutes: number; // ミリ秒に変換するための分数
}

export const NOTIFICATION_INTERVAL_OPTIONS: NotificationIntervalOption[] = [
  { value: 'immediate', label: '即座', minutes: 0 },
  { value: '1', label: '1分', minutes: 1 },
  { value: '5', label: '5分', minutes: 5 },
  { value: '10', label: '10分', minutes: 10 },
  { value: '30', label: '30分', minutes: 30 },
];

/**
 * 通知ポーリング間隔を取得（ミリ秒）
 * @returns ポーリング間隔（ミリ秒）。即座の場合は0を返す
 */
export function getNotificationInterval(): number {
  if (typeof window === 'undefined') {
    return 10 * 60 * 1000; // デフォルト: 10分
  }

  const stored = localStorage.getItem(NOTIFICATION_INTERVAL_KEY);
  if (!stored) {
    return 10 * 60 * 1000; // デフォルト: 10分
  }

  const option = NOTIFICATION_INTERVAL_OPTIONS.find((opt) => opt.value === stored);
  if (!option) {
    return 10 * 60 * 1000; // デフォルト: 10分
  }

  if (option.value === 'immediate') {
    return 0; // 即座の場合は0（ポーリングしない）
  }

  return option.minutes * 60 * 1000;
}

/**
 * 通知ポーリング間隔を設定
 * @param interval 間隔の値
 */
export function setNotificationInterval(interval: NotificationInterval): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATION_INTERVAL_KEY, interval);
  // 設定変更を通知するカスタムイベントを発火
  window.dispatchEvent(new CustomEvent('notificationIntervalChanged', { detail: { interval } }));
}

/**
 * 通知ポーリング間隔の設定値を取得
 * @returns 設定値（デフォルト: '10'）
 */
export function getNotificationIntervalValue(): NotificationInterval {
  if (typeof window === 'undefined') {
    return '10';
  }

  const stored = localStorage.getItem(NOTIFICATION_INTERVAL_KEY);
  if (!stored) {
    return '10';
  }

  const option = NOTIFICATION_INTERVAL_OPTIONS.find((opt) => opt.value === stored);
  return option ? option.value : '10';
}

/**
 * バックグラウンドでの通知確認が有効かどうかを取得
 * @returns バックグラウンドでの通知確認が有効な場合true（デフォルト: false）
 */
export function getBackgroundNotificationEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false; // デフォルト: OFF
  }

  const stored = localStorage.getItem(BACKGROUND_NOTIFICATION_KEY);
  if (!stored) {
    return false; // デフォルト: OFF
  }

  return stored === 'true';
}

/**
 * バックグラウンドでの通知確認を設定
 * @param enabled バックグラウンドでの通知確認を有効にするかどうか
 */
export function setBackgroundNotificationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKGROUND_NOTIFICATION_KEY, enabled ? 'true' : 'false');
  // 設定変更を通知するカスタムイベントを発火
  window.dispatchEvent(new CustomEvent('backgroundNotificationSettingChanged', { detail: { enabled } }));
}

