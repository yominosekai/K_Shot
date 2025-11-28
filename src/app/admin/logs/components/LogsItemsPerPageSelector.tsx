// 表示件数選択コンポーネント

'use client';

import type { ItemsPerPage } from '../types';

interface LogsItemsPerPageSelectorProps {
  itemsPerPage: ItemsPerPage;
  onItemsPerPageChange: (items: ItemsPerPage) => void;
  totalLogs: number;
  currentPage: number;
}

export default function LogsItemsPerPageSelector({
  itemsPerPage,
  onItemsPerPageChange,
  totalLogs,
  currentPage,
}: LogsItemsPerPageSelectorProps) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalLogs);

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          表示件数:
        </label>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value) as ItemsPerPage)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value={25}>25件</option>
          <option value={50}>50件</option>
          <option value={100}>100件</option>
        </select>
      </div>
      {totalLogs > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {start} - {end} / {totalLogs} 件
        </div>
      )}
    </div>
  );
}

