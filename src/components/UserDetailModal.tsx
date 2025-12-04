// ユーザー詳細モーダルコンポーネント

'use client';

import { X, Mail, Building2, Calendar, Award, Code, User, Clock } from 'lucide-react';
import Image from 'next/image';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

export default function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  const { getAvatarUrl } = useUsers();
  const confirmDialog = useConfirmDialog();
  
  if (!isOpen || !user) return null;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user.display_name || user.username}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="閉じる"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 基本情報 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                基本情報
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      メールアドレス
                    </label>
                    <button
                      onClick={handleEmailClick}
                      className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="break-all">{user.email}</span>
                    </button>
                  </div>
                )}
                {(user.department || user.department_id) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      部署
                    </label>
                    <div className="flex items-center text-gray-900 dark:text-gray-100">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{user.department || user.department_id}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    登録日
                  </label>
                  <div className="flex items-center text-gray-900 dark:text-gray-100">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{formatDate(user.created_date)}</span>
                  </div>
                </div>
                {user.last_login && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      最終ログイン
                    </label>
                    <div className="flex items-center text-gray-900 dark:text-gray-100">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{formatDate(user.last_login)}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ステータス
                  </label>
                  <div className="flex items-center text-gray-900 dark:text-gray-100">
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
                  </div>
                </div>
              </div>
            </div>

            {/* 自己紹介 */}
            {user.bio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  自己紹介
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{user.bio}</p>
                </div>
              </div>
            )}

            {/* スキル */}
            {user.skills && user.skills.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  スキル
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 資格 */}
            {user.certifications && user.certifications.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  資格
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.certifications.map((cert, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 職場内資格 */}
            {user.mos && user.mos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  職場内資格
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.mos.map((mos, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                    >
                      {mos}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

