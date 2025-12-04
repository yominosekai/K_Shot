// プロフィールヘッダーコンポーネント

import Image from 'next/image';
import type { User } from '@/features/auth/types';

interface ProfileHeaderProps {
  user: User;
  avatarUrl: string;
  isEditing: boolean;
  onEditClick: () => void;
  onCancelClick: () => void;
  onAvatarError: () => void;
}

export default function ProfileHeader({
  user,
  avatarUrl,
  isEditing,
  onEditClick,
  onCancelClick,
  onAvatarError,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center space-x-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-3xl font-bold text-white overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 shadow-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized={false}
              onError={onAvatarError}
            />
          ) : (
            user.display_name?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.display_name}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
          <div className="mt-2 flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {user.role === 'admin'
                ? '管理者'
                : user.role === 'instructor'
                ? '教育者'
                : user.role === 'training'
                ? '教育訓練'
                : '一般ユーザー'}
            </span>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={onEditClick}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            編集
          </button>
        )}
        {isEditing && (
          <button
            onClick={onCancelClick}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}



