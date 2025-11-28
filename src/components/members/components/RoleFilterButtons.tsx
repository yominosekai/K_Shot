// ロールフィルターボタンコンポーネント

'use client';

import { Filter } from 'lucide-react';

interface RoleFilterButtonsProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  onToggleFilters: () => void;
  showFilters: boolean;
}

export default function RoleFilterButtons({
  selectedRole,
  onRoleChange,
  onToggleFilters,
  showFilters,
}: RoleFilterButtonsProps) {
  return (
    <div className="flex items-center space-x-4 mb-6">
      <button
        onClick={() => onRoleChange('all')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedRole === 'all'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        すべて
      </button>
      <button
        onClick={() => onRoleChange('admin')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedRole === 'admin'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        管理者
      </button>
      <button
        onClick={() => onRoleChange('instructor')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedRole === 'instructor'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        教育者
      </button>
      <button
        onClick={() => onRoleChange('user')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedRole === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        一般ユーザー
      </button>
      <button
        onClick={onToggleFilters}
        className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
          showFilters
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>フィルター</span>
      </button>
    </div>
  );
}

