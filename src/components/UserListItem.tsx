// ユーザーリストアイテムコンポーネント

'use client';

import { Mail, Building2, Calendar, Award, Code } from 'lucide-react';
import Image from 'next/image';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface UserListItemProps {
  user: UserType;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function UserListItem({ user, onClick, onContextMenu }: UserListItemProps) {
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
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      instructor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[role] || colors.user;
  };

  return (
    <div
      data-user-item
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 p-4 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center space-x-4">
        {/* アバター */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
          {(() => {
            const avatarSourceId = user.id;
            const avatarUrl = avatarSourceId ? getAvatarUrl(avatarSourceId) : null;
            return avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={48}
                height={48}
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

        {/* 基本情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {user.display_name || user.username}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)} flex-shrink-0`}>
              {getRoleLabel(user.role)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {user.email && (
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate max-w-xs">{user.email}</span>
              </div>
            )}
            {user.department_id && (
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{user.department_id}</span>
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
              <span>{formatDate(user.created_date)}</span>
            </div>
          </div>

          {/* スキル・資格（簡易表示） */}
          {(user.skills && user.skills.length > 0) || (user.certifications && user.certifications.length > 0) || (user.mos && user.mos.length > 0) ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {user.skills && user.skills.length > 0 && (
                <div className="flex items-center gap-1">
                  <Code className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.skills.slice(0, 2).join(', ')}
                    {user.skills.length > 2 && ` +${user.skills.length - 2}`}
                  </span>
                </div>
              )}
              {user.certifications && user.certifications.length > 0 && (
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.certifications.slice(0, 2).join(', ')}
                    {user.certifications.length > 2 && ` +${user.certifications.length - 2}`}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ステータス */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {user.is_active ? (
            <span className="flex items-center text-xs text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              アクティブ
            </span>
          ) : (
            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
              非アクティブ
            </span>
          )}
          {user.last_login && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(user.last_login)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

