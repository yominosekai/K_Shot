// ユーザーカードコンポーネント

'use client';

import { User, Mail, Building2, Calendar, Award, Code } from 'lucide-react';
import Image from 'next/image';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface UserCardProps {
  user: UserType;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function UserCard({ user, onClick, onContextMenu }: UserCardProps) {
  const { getAvatarUrl } = useUsers();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '管理者',
      instructor: '教育者',
      user: '一般ユーザー',
      training: '教育訓練',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      instructor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      training: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colors[role] || colors.user;
  };

  return (
    <div
      data-user-item
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 p-6 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* アバター */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
            {(() => {
              const avatarSourceId = user.id;
              const avatarUrl = avatarSourceId ? getAvatarUrl(avatarSourceId) : null;
              return avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized={false}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'
              );
            })()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {user.display_name || user.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
          </div>
        </div>
        {/* ロールバッジ */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>
      </div>

      {/* 基本情報 */}
      <div className="space-y-2 mb-4">
        {user.email && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        )}
        {user.department_id && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{user.department_id}</span>
          </div>
        )}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>登録日: {formatDate(user.created_date)}</span>
        </div>
      </div>

      {/* スキル・資格 */}
      {(user.skills && user.skills.length > 0) || (user.certifications && user.certifications.length > 0) || (user.mos && user.mos.length > 0) ? (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {user.skills && user.skills.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <Code className="w-3 h-3 mr-1" />
                スキル
              </div>
              <div className="flex flex-wrap gap-1">
                {user.skills.slice(0, 3).map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
                {user.skills.length > 3 && (
                  <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                    +{user.skills.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
          {user.certifications && user.certifications.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <Award className="w-3 h-3 mr-1" />
                資格
              </div>
              <div className="flex flex-wrap gap-1">
                {user.certifications.slice(0, 3).map((cert, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs"
                  >
                    {cert}
                  </span>
                ))}
                {user.certifications.length > 3 && (
                  <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                    +{user.certifications.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
          {user.mos && user.mos.length > 0 && (
            <div>
              <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <Award className="w-3 h-3 mr-1" />
                職場内資格
              </div>
              <div className="flex flex-wrap gap-1">
                {user.mos.slice(0, 3).map((mos, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs"
                  >
                    {mos}
                  </span>
                ))}
                {user.mos.length > 3 && (
                  <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                    +{user.mos.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ステータス */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.is_active ? (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                アクティブ
              </span>
            ) : (
              <span className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                非アクティブ
              </span>
            )}
          </span>
          {user.last_login && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              最終ログイン: {formatDate(user.last_login)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

