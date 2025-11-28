// ログ統計情報セクションコンポーネント

'use client';

import type { LogEntry } from '../types';

interface LogsStatsSectionProps {
  filteredLogs: LogEntry[];
}

export default function LogsStatsSection({ filteredLogs }: LogsStatsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">総ログ数</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredLogs.length}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">エラーログ</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {filteredLogs.filter(l => l.logType === 'error').length}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">SQLITE_BUSY</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {filteredLogs.filter(l => l.logType === 'busy').length}
          </div>
        </div>
      </div>
    </div>
  );
}

