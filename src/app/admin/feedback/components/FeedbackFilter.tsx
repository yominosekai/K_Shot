'use client';

import { Filter, Eye, EyeOff } from 'lucide-react';

interface FeedbackFilterProps {
  statusFilter: string;
  isPublicFilter: string;
  showDetails: boolean;
  onStatusFilterChange: (value: string) => void;
  onIsPublicFilterChange: (value: string) => void;
  onShowDetailsChange: (checked: boolean) => void;
}

export default function FeedbackFilter({
  statusFilter,
  isPublicFilter,
  showDetails,
  onStatusFilterChange,
  onIsPublicFilterChange,
  onShowDetailsChange,
}: FeedbackFilterProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ステータス:</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">すべて</option>
            <option value="open">対応中</option>
            <option value="resolved">対応済み</option>
            <option value="closed">クローズ</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">公開設定:</label>
          <select
            value={isPublicFilter}
            onChange={(e) => onIsPublicFilterChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">すべて</option>
            <option value="true">公開</option>
            <option value="false">非公開</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => onShowDetailsChange(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
              {showDetails ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  詳細表示
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  メタデータのみ
                </>
              )}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}


