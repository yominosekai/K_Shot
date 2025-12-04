// 権限変更モーダルコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { X, User, Shield, GraduationCap, Lock } from 'lucide-react';
import Image from 'next/image';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onSuccess?: () => void;
}

export default function RoleChangeModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}: RoleChangeModalProps) {
  const { getAvatarUrl } = useUsers();
  const { updateUser: updateAuthUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'instructor' | 'admin' | 'training'>('user');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルを開いた時に、自分自身を自動選択（全ユーザー共通）
  useEffect(() => {
    if (isOpen && currentUser) {
      // 全ユーザー（管理者含む）が自分自身を自動選択
      setSelectedUser(currentUser);
      setNewRole(currentUser.role as 'user' | 'instructor' | 'admin' | 'training');
      setPassword('');
      setError(null);
    }
  }, [isOpen, currentUser]);


  // モーダルを閉じる時にリセット
  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setNewRole('user');
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      setError('ユーザーを選択してください');
      return;
    }

    // 新しい権限が一般ユーザー以外（教育者・管理者・教育訓練）の場合はパスワード必須
    const requiresPassword = newRole !== 'user';
    if (requiresPassword && !password) {
      setError('パスワードを入力してください');
      return;
    }

    if (selectedUser.role === newRole) {
      setError('既に同じ権限です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const targetUserId = selectedUser.id;
      if (!targetUserId) {
        setError('対象ユーザーIDを特定できませんでした');
        return;
      }
      const changerId = currentUser.id;
      if (!changerId) {
        setError('操作ユーザーIDを特定できませんでした');
        return;
      }
      // IDにハイフンが含まれるため、URLエンコードが必要
      const encodedId = encodeURIComponent(targetUserId);
      // 新しい権限が一般ユーザー以外（教育者・管理者・教育訓練）の場合はパスワードを送信
      const requiresPassword = newRole !== 'user';
      
      const response = await fetch(`/api/users/${encodedId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_role: newRole,
          password: requiresPassword ? password : '', // 一般ユーザー以外はパスワード必須
          changed_by: changerId,
        }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        throw new Error(`サーバーからの応答を解析できませんでした (${response.status})`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || `権限の変更に失敗しました (${response.status})`);
      }

      // 成功
      setPassword('');
      setError(null);
      
      // 自分自身の権限変更の場合は、セッション（Cookie）を更新
      if (currentUser && selectedUser && currentUser.id === selectedUser.id && data.user) {
        updateAuthUser(data.user);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('権限変更エラー:', err);
      setError(err instanceof Error ? err.message : '権限の変更に失敗しました');
    } finally {
      setLoading(false);
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">権限変更</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 自分自身の権限変更の場合の表示（全ユーザー共通） */}
          {selectedUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                対象ユーザー
              </label>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {(() => {
                    const avatarSourceId = selectedUser.id;
                    const avatarUrl = avatarSourceId ? getAvatarUrl(avatarSourceId) : null;
                    return avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized={false}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      selectedUser.display_name?.charAt(0) || selectedUser.username?.charAt(0) || 'U'
                    );
                  })()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedUser.display_name || selectedUser.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    現在の権限: {getRoleLabel(selectedUser.role)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 新しい権限選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              新しい権限
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={newRole === 'user'}
                  onChange={() => setNewRole('user')}
                  className="w-4 h-4 text-blue-600"
                />
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">一般ユーザー</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="instructor"
                  checked={newRole === 'instructor'}
                  onChange={() => setNewRole('instructor')}
                  className="w-4 h-4 text-blue-600"
                />
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span className="text-gray-900 dark:text-gray-100">教育者</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="training"
                  checked={newRole === 'training'}
                  onChange={() => setNewRole('training')}
                  className="w-4 h-4 text-blue-600"
                />
                <GraduationCap className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-900 dark:text-gray-100">教育訓練</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={newRole === 'admin'}
                  onChange={() => setNewRole('admin')}
                  className="w-4 h-4 text-blue-600"
                />
                <Shield className="w-5 h-5 text-red-400" />
                <span className="text-gray-900 dark:text-gray-100">管理者</span>
              </label>
            </div>
          </div>

          {/* パスワード入力（新しい権限が一般ユーザー以外の場合に表示） */}
          {selectedUser && newRole !== 'user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="権限変更パスワードを入力"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                権限変更にはパスワードが必要です
              </p>
            </div>
          )}

          {/* エラーメッセージ */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* フッター */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUser || selectedUser.role === newRole}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '変更中...' : '権限を変更'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

