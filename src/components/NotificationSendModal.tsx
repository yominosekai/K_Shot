// 通知送信モーダルコンポーネント

'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserSelectionList from './NotificationSendModal/components/UserSelectionList';
import NotificationFavoritesManager from './NotificationSendModal/components/NotificationFavoritesManager';
import type { MaterialNormalized } from '@/features/materials/types';
import type { User as UserType } from '@/features/auth/types';

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface NotificationSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: MaterialNormalized | null;
  targetUserId?: string | null; // 特定のユーザーに送信する場合
  onSuccess?: () => void;
}

export default function NotificationSendModal({
  isOpen,
  onClose,
  material,
  targetUserId,
  onSuccess,
}: NotificationSendModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]); // フィルタ前の全ユーザー
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const resolveUserId = (account?: UserType | null) => account?.id ?? null;
  const authUserId = resolveUserId(user);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // 部署一覧を取得
  useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        try {
          setLoadingDepartments(true);
          const response = await fetch('/api/departments');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setDepartments(data.departments || []);
            }
          }
        } catch (err) {
          console.error('部署一覧取得エラー:', err);
        } finally {
          setLoadingDepartments(false);
        }
      };
      fetchDepartments();
    }
  }, [isOpen]);

  // ユーザー一覧を取得
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/users');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              let fetchedUsers = data.users || [];
              // 送信者自身を除外（テスト用に一時的にコメントアウト）
              // if (authUserId) {
              //   fetchedUsers = fetchedUsers.filter((u: UserType) => resolveUserId(u) !== authUserId);
              // }
              // 特定のユーザーに送信する場合、そのユーザーのみを表示
              if (targetUserId) {
                fetchedUsers = fetchedUsers.filter((u: UserType) => resolveUserId(u) === targetUserId);
              }
              setAllUsers(fetchedUsers);
            }
          }
        } catch (err) {
          console.error('ユーザー取得エラー:', err);
        }
      };
      fetchUsers();
    }
  }, [isOpen, authUserId, targetUserId]);

  // 部署フィルタリング
  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];

    // 部署フィルター
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(
        (u) => u.department === selectedDepartment || u.department_id === selectedDepartment
      );
    }

    return filtered;
  }, [allUsers, selectedDepartment]);

  // フィルタリングされたユーザーを設定
  useEffect(() => {
    setUsers(filteredUsers);
  }, [filteredUsers]);

  // モーダルを開いた時にリセット
  useEffect(() => {
    if (isOpen) {
      if (targetUserId) {
        // 特定のユーザーに送信する場合、そのユーザーを自動選択
        setSelectedUserIds(new Set([targetUserId]));
      } else {
        setSelectedUserIds(new Set());
      }
      setMessage('');
      setError(null);
      setSelectedDepartment('all'); // 部署フィルターをリセット
      if (material) {
        setMessage(`${material.title}について確認をお願いします。`);
      }
    }
  }, [isOpen, material, targetUserId]);

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      const ids = users
        .map((u) => resolveUserId(u))
        .filter((id): id is string => Boolean(id));
      setSelectedUserIds(new Set(ids));
    }
  };

  const handleApplyFavorite = (userIds: string[]) => {
    setSelectedUserIds(new Set(userIds));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUserIds.size === 0) {
      setError('送信先を選択してください');
      return;
    }

    if (!message.trim()) {
      setError('メッセージを入力してください');
      return;
    }

    if (!user || !authUserId) {
      setError('ユーザー情報が取得できません');
      return;
    }

    setSending(true);
    setError(null);

    try {
      let title: string;
      let notificationType: string;
      
      if (material) {
        // 資料関連の通知
        title = `${user.display_name || user.username}さんから通知: ${material.title}`;
        notificationType = 'material_notification';
      } else {
        // ユーザー間のメッセージ
        const targetUser = users.find(u => resolveUserId(u) === targetUserId);
        const targetUserName = targetUser ? (targetUser.display_name || targetUser.username) : 'ユーザー';
        title = `${user.display_name || user.username}さんからのメッセージ`;
        notificationType = 'user_message';
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: Array.from(selectedUserIds),
          from_user_id: authUserId,
          material_id: material?.id || null,
          title: title,
          message: message.trim(),
          type: notificationType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '通知の送信に失敗しました');
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('通知送信エラー:', err);
      setError(err instanceof Error ? err.message : '通知の送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>通知を送信</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 資料情報 */}
          {material && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                対象資料
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-gray-100 font-medium">{material.title}</p>
              </div>
            </div>
          )}

          {/* お気に入り管理 */}
          {authUserId && !targetUserId && (
            <NotificationFavoritesManager
              userId={authUserId}
              selectedUserIds={selectedUserIds}
              onApplyFavorite={handleApplyFavorite}
            />
          )}

          {/* 部署フィルター */}
          {!targetUserId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                部署でフィルター
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                disabled={loadingDepartments}
              >
                <option value="all">すべて</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 送信先ユーザー選択 */}
          <UserSelectionList
            users={users}
            selectedUserIds={selectedUserIds}
            onUserToggle={handleUserToggle}
            targetUserId={targetUserId}
            onSelectAll={handleSelectAll}
          />

          {/* メッセージ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              メッセージ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              placeholder="通知メッセージを入力してください"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
              disabled={sending}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={sending || selectedUserIds.size === 0 || !message.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sending ? (
                <>
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>通知を送信</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

