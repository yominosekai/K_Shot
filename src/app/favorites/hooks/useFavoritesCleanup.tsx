// お気に入りページのクリーンアップ処理フック

'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface UseFavoritesCleanupProps {
  refreshMaterials: () => Promise<void>;
  showToast: (message: string) => void;
  bookmarks?: {
    fetchBookmarks?: () => Promise<void>;
  };
}

export function useFavoritesCleanup({
  refreshMaterials,
  showToast,
  bookmarks,
}: UseFavoritesCleanupProps) {
  const { user } = useAuth();
  const confirmDialog = useConfirmDialog();
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleCleanup = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsCleaningUp(true);
    try {
      // まず削除対象をチェック（check_only=true）
      const checkResponse = await fetch(`/api/users/${encodeURIComponent(user.id)}/bookmarks/cleanup?check_only=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!checkResponse.ok) {
        showToast('お気に入りのチェックに失敗しました');
        return;
      }

      const checkData = await checkResponse.json();
      
      if (!checkData.success) {
        showToast(checkData.error || 'お気に入りのチェックに失敗しました');
        return;
      }

      // 削除対象がない場合
      if (checkData.removedCount === 0) {
        showToast('削除するお気に入りがありません');
        return;
      }

      // 削除対象がある場合、確認モーダルを表示
      const removedMaterials = checkData.removedMaterials || [];
      const removedList = removedMaterials
        .map((m: { id: string; title?: string }) => `・${m.title || m.id}`)
        .join('\n');

      const confirmed = await confirmDialog({
        title: '存在しない資料を削除',
        message: (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              以下の{removedMaterials.length}件の存在しない資料をお気に入りから削除しますか？
            </p>
            <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                {removedList}
              </pre>
            </div>
          </div>
        ),
        confirmText: '削除する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });

      if (!confirmed) {
        return;
      }

      // 削除を実行（check_onlyなし）
      const deleteResponse = await fetch(`/api/users/${encodeURIComponent(user.id)}/bookmarks/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        if (deleteData.success) {
          // お気に入り一覧を再取得
          if (bookmarks?.fetchBookmarks) {
            await bookmarks.fetchBookmarks();
          }
          // 資料一覧を再取得
          await refreshMaterials();
          
          // 成功メッセージを表示
          showToast(`${removedMaterials.length}件の存在しない資料をお気に入りから削除しました`);
        } else {
          showToast(deleteData.error || 'お気に入りの削除に失敗しました');
        }
      } else {
        showToast('お気に入りの削除に失敗しました');
      }
    } catch (err) {
      console.error('お気に入りクリーンアップエラー:', err);
      showToast('お気に入りのクリーンアップに失敗しました');
    } finally {
      setIsCleaningUp(false);
    }
  }, [user?.id, confirmDialog, bookmarks, refreshMaterials, showToast]);

  return {
    isCleaningUp,
    handleCleanup,
  };
}
