// エラーチェック画面のユーティリティ関数

import type { LogEntry } from './types';

/**
 * ログエントリの表示用テキストを取得
 */
export function getLogDisplayText(log: LogEntry): string {
  if (log.logType === 'error') {
    return log.message || log.error?.message || 'エラー';
  } else {
    return log.operation || 'SQLITE_BUSY';
  }
}

/**
 * 日付フォーマット
 */
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

