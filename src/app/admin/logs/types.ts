// エラーチェック画面の型定義

export interface LogEntry {
  timestamp: string;
  logType: 'error' | 'busy';
  user_sid?: string;
  userSid?: string;
  userDisplayName?: string;
  userUsername?: string;
  // エラーログ用
  level?: string;
  module?: string;
  message?: string;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  details?: any;
  // SQLITE_BUSYログ用
  operation?: string;
  retryCount?: number;
  success?: boolean;
  additionalInfo?: Record<string, any>;
}

export type SortField = 'timestamp' | 'user' | 'module' | 'operation' | 'retryCount';
export type SortOrder = 'asc' | 'desc';
export type LogTypeFilter = 'all' | 'errors' | 'busy';
export type ItemsPerPage = 25 | 50 | 100;

export const DEFAULT_ITEMS_PER_PAGE: ItemsPerPage = 50;

