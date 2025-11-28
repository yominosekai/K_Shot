// 詳細情報表示コンポーネント

'use client';

import { Mail } from 'lucide-react';
import type { User } from '@/features/auth/types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface ProfileDetailInfoProps {
  user: User;
  bio?: string;
}

export default function ProfileDetailInfo({ user, bio }: ProfileDetailInfoProps) {
  const confirmDialog = useConfirmDialog();

  const handleEmailClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    const confirmed = await confirmDialog({
      title: 'メール送信の確認',
      message: 'メーラーを起動して新規メールを作成しますか？',
      confirmText: '起動する',
      cancelText: 'キャンセル',
    });
    if (confirmed) {
      window.location.href = `mailto:${user.email}`;
    }
  };

  return (
    <>
      {/* 自己紹介 */}
      {bio && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            自己紹介
          </h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{bio}</p>
        </div>
      )}

      {/* 詳細情報 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          詳細情報
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">メールアドレス</p>
              <button
                onClick={handleEmailClick}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                <span className="break-all">{user.email}</span>
              </button>
            </div>
            {(user.department || user.department_id) && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">部署</p>
                <p className="text-gray-900 dark:text-gray-100">{user.department || user.department_id}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">登録日</p>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(user.created_date).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">最終ログイン</p>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(user.last_login).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

