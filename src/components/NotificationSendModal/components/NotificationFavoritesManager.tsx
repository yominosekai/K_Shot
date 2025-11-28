// 通知送信お気に入り管理コンポーネント

'use client';

import { useState, useEffect } from 'react';
import { Star, Plus, Trash2, X } from 'lucide-react';
import type { User as UserType } from '@/features/auth/types';

interface NotificationFavorite {
  id: string;
  name: string;
  userSids: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotificationFavoritesManagerProps {
  userSid: string;
  selectedUserSids: Set<string>;
  onApplyFavorite: (userSids: string[]) => void;
}

export default function NotificationFavoritesManager({
  userSid,
  selectedUserSids,
  onApplyFavorite,
}: NotificationFavoritesManagerProps) {
  const [favorites, setFavorites] = useState<NotificationFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // お気に入り一覧を取得
  useEffect(() => {
    if (userSid) {
      fetchFavorites();
    }
  }, [userSid]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${encodeURIComponent(userSid)}/notification-favorites`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFavorites(data.favorites || []);
        }
      }
    } catch (err) {
      console.error('お気に入り取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFavorite = async () => {
    if (!favoriteName.trim()) {
      setError('お気に入り名を入力してください');
      return;
    }

    if (selectedUserSids.size === 0) {
      setError('ユーザーを選択してください');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userSid)}/notification-favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: favoriteName.trim(),
          userSids: Array.from(selectedUserSids),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'お気に入りの作成に失敗しました');
      }

      setFavorites((prev) => [...prev, data.favorite]);
      setFavoriteName('');
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お気に入りの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFavorite = async (favoriteId: string) => {
    if (!confirm('このお気に入りを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(userSid)}/notification-favorites?id=${encodeURIComponent(favoriteId)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'お気に入りの削除に失敗しました');
      }

      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'お気に入りの削除に失敗しました');
    }
  };

  const handleApplyFavorite = (favorite: NotificationFavorite) => {
    onApplyFavorite(favorite.userSids);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
          <Star className="w-4 h-4" />
          <span>お気に入り</span>
        </label>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          disabled={selectedUserSids.size === 0}
        >
          <Plus className="w-4 h-4" />
          <span>新規作成</span>
        </button>
      </div>

      {favorites.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
            >
              <button
                type="button"
                onClick={() => handleApplyFavorite(favorite)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[120px]"
                title={favorite.name}
              >
                {favorite.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFavorite(favorite.id)}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title="削除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">お気に入りがありません</p>
      )}

      {/* 作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">お気に入りを作成</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setFavoriteName('');
                  setError(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  お気に入り名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={favoriteName}
                  onChange={(e) => setFavoriteName(e.target.value)}
                  placeholder="例: 開発チーム"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  選択中のユーザー: <span className="font-medium">{selectedUserSids.size}人</span>
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFavoriteName('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={creating}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleCreateFavorite}
                  disabled={creating || !favoriteName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? '作成中...' : '作成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

