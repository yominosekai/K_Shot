// アカウント管理セクション（管理者専用）

'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import AccountManagementModal from '@/components/AccountManagementModal';

export default function AccountManagementSection() {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">アカウント管理</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            ユーザーアカウントの一覧表示、権限変更、削除ができます。
          </p>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            アカウント管理を開く
          </button>
        </div>
      </div>

      <AccountManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
}


