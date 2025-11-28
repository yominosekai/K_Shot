// ログテーブルコンポーネント

'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { LogEntry, SortField, LogTypeFilter } from '../types';
import { getLogDisplayText, formatDate } from '../utils';
import LogsPagination from './LogsPagination';

interface LogsTableProps {
  logs: LogEntry[];
  loading: boolean;
  logTypeFilter: LogTypeFilter;
  sortField: SortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function LogsTable({
  logs,
  loading,
  logTypeFilter,
  sortField,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
}: LogsTableProps) {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('timestamp')}
              >
                <div className="flex items-center space-x-1">
                  <span>日時</span>
                  {getSortIcon('timestamp')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('user')}
              >
                <div className="flex items-center space-x-1">
                  <span>ユーザー</span>
                  {getSortIcon('user')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                タイプ
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('module')}
              >
                <div className="flex items-center space-x-1">
                  <span>モジュール/操作</span>
                  {getSortIcon('module')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                内容
              </th>
              {logTypeFilter === 'busy' || logTypeFilter === 'all' ? (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => onSort('retryCount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>リトライ</span>
                    {getSortIcon('retryCount')}
                  </div>
                </th>
              ) : null}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                ステータス
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={logTypeFilter === 'busy' || logTypeFilter === 'all' ? 7 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  読み込み中...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={logTypeFilter === 'busy' || logTypeFilter === 'all' ? 7 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  ログが見つかりませんでした
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr
                  key={`${log.timestamp}-${index}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {log.userDisplayName || log.user_sid || log.userSid || '不明'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.logType === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {log.logType === 'error' ? 'エラー' : 'BUSY'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {log.module || log.operation || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-md truncate">
                    <div className="truncate" title={getLogDisplayText(log)}>
                      {getLogDisplayText(log)}
                    </div>
                    {log.error?.code && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        コード: {log.error.code}
                      </div>
                    )}
                  </td>
                  {logTypeFilter === 'busy' || logTypeFilter === 'all' ? (
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {log.retryCount !== undefined ? `${log.retryCount}回` : '-'}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-sm">
                    {log.logType === 'busy' ? (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.success
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {log.success ? '成功' : '失敗'}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      <LogsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

