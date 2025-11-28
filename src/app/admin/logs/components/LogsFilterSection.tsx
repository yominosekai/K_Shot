// ログフィルターセクションコンポーネント

'use client';

import { Search, RefreshCw } from 'lucide-react';
import type { LogTypeFilter } from '../types';

interface LogsFilterSectionProps {
  logTypeFilter: LogTypeFilter;
  onLogTypeFilterChange: (filter: LogTypeFilter) => void;
  userFilter: string;
  onUserFilterChange: (filter: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  uniqueUsers: Array<{ sid: string; displayName: string }>;
  loading: boolean;
  onRefresh: () => void;
}

export default function LogsFilterSection({
  logTypeFilter,
  onLogTypeFilterChange,
  userFilter,
  onUserFilterChange,
  searchTerm,
  onSearchTermChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  uniqueUsers,
  loading,
  onRefresh,
}: LogsFilterSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ログタイプフィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ログタイプ
          </label>
          <select
            value={logTypeFilter}
            onChange={(e) => onLogTypeFilterChange(e.target.value as LogTypeFilter)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">すべて</option>
            <option value="errors">エラーログ</option>
            <option value="busy">SQLITE_BUSY</option>
          </select>
        </div>

        {/* ユーザーフィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ユーザー
          </label>
          <select
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">すべて</option>
            {uniqueUsers.map(user => (
              <option key={user.sid} value={user.sid}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* 日付範囲（開始） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            開始日
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* 日付範囲（終了） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            終了日
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* 検索 */}
      <div className="mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="モジュール名、メッセージ、操作名で検索..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* リロードボタン */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>更新</span>
        </button>
      </div>
    </div>
  );
}

