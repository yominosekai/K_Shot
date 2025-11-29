// ユーザー選択リストコンポーネント

'use client';

import Image from 'next/image';
import { useUsers } from '@/contexts/UsersContext';
import type { User as UserType } from '@/features/auth/types';

interface UserSelectionListProps {
  users: UserType[];
  selectedUserIds: Set<string>;
  onUserToggle: (userId: string) => void;
  targetUserId?: string | null;
  onSelectAll?: () => void;
}

const resolveUserId = (user: UserType) => user.id ?? '';

export default function UserSelectionList({
  users,
  selectedUserIds,
  onUserToggle,
  targetUserId,
  onSelectAll,
}: UserSelectionListProps) {
  const { getAvatarUrl } = useUsers();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          送信先
        </label>
        {!targetUserId && onSelectAll && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {selectedUserIds.size === users.length ? 'すべて解除' : 'すべて選択'}
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-2 space-y-1">
        {users.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">ユーザーがありません</p>
        ) : (
          users.map((u) => {
            const userId = resolveUserId(u);
            if (!userId) {
              return null;
            }
            return (
            <label
              key={userId}
              className={`flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                targetUserId ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedUserIds.has(userId)}
                onChange={() => onUserToggle(userId)}
                disabled={targetUserId !== null && targetUserId !== undefined}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
              />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                {(() => {
                  const avatarUrl = getAvatarUrl(userId);
                  return avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized={false}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    u.display_name?.charAt(0) || u.username?.charAt(0) || 'U'
                  );
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {u.display_name || u.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {u.email}
                </p>
              </div>
            </label>
          );
          })
        )}
      </div>
      {selectedUserIds.size > 0 && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {selectedUserIds.size}人に送信します
        </p>
      )}
    </div>
  );
}

