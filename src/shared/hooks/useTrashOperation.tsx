'use client';

// ゴミ箱操作のカスタムフック

import { useState, useCallback, ReactNode } from 'react';
import type { MaterialNormalized, FolderNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface UseTrashOperationProps {
  user: User | null;
  buildFullPath: (folder?: FolderNormalized, material?: MaterialNormalized) => string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function useTrashOperation({
  user,
  buildFullPath,
  onSuccess,
  onError,
}: UseTrashOperationProps) {
  const confirmDialog = useConfirmDialog();
  const [isMovingToTrash, setIsMovingToTrash] = useState(false);
  const [trashProgress, setTrashProgress] = useState<number>(0);
  const [trashMessage, setTrashMessage] = useState<string>('ゴミ箱に移動中...');

  const moveMaterialToTrash = useCallback(
    async (material: MaterialNormalized) => {
      if (!user?.id) {
        onError?.('ユーザー情報が取得できません');
        return;
      }

      const confirmed = await confirmDialog({
        title: '資料をゴミ箱に移動',
        message: (
          <div className="space-y-2">
            <p>資料「{material.title}」をゴミ箱に移動しますか？</p>
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
              以下の情報が削除されます：
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>閲覧数</li>
                <li>いいね</li>
                <li>お気に入り</li>
                <li>コメント</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              本当によろしいですか？
            </p>
          </div>
        ),
        confirmText: '移動する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (!confirmed) {
        return;
      }

      setIsMovingToTrash(true);
      setTrashProgress(0);
      setTrashMessage('ファイルをコピー中... → Next: 元のファイルを削除');

      try {
        const originalPath = buildFullPath(undefined, material);

        // 簡易的なプログレスバー（ファイルコピー/削除の進捗は正確に取得できないため）
        const progressInterval = setInterval(() => {
          setTrashProgress((prev) => {
            const newProgress = prev + 5; // 5%ずつ増加

            // ステップに応じてメッセージを更新
            if (newProgress >= 80 && prev < 80) {
              setTrashMessage('SQLiteから削除中... → Next: 完了');
            } else if (newProgress >= 50 && prev < 50) {
              setTrashMessage('元のファイルを削除中... → Next: SQLiteから削除');
            } else if (newProgress >= 20 && prev < 20) {
              setTrashMessage('ファイルをコピー中... → Next: 元のファイルを削除');
            }

            if (newProgress >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return newProgress;
          });
        }, 200); // 200msごとに更新

        const response = await fetch('/api/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'material',
            original_id: material.id,
            original_path: originalPath,
            original_name: material.title,
            user_id: user.id,
            original_folder_path: material.folder_path || '',
          }),
        });

        clearInterval(progressInterval);
        setTrashProgress(100);
        setTrashMessage('完了');

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            onSuccess?.();
          } else {
            onError?.('ゴミ箱への移動に失敗しました');
          }
        } else {
          onError?.('ゴミ箱への移動に失敗しました');
        }
      } catch (err) {
        console.error('ゴミ箱への移動エラー:', err);
        onError?.('ゴミ箱への移動に失敗しました');
      } finally {
        setIsMovingToTrash(false);
        setTrashProgress(0);
        setTrashMessage('ゴミ箱に移動中...');
      }
    },
    [user, buildFullPath, onSuccess, onError, confirmDialog]
  );

  const moveFolderToTrash = useCallback(
    async (folder: FolderNormalized) => {
      if (!user?.id) {
        onError?.('ユーザー情報が取得できません');
        return;
      }

      const confirmed = await confirmDialog({
        title: 'フォルダをゴミ箱に移動',
        message: (
          <div className="space-y-2">
            <p>フォルダ「{folder.name}」をゴミ箱に移動しますか？</p>
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
              フォルダ内の全資料に関する以下の情報が削除されます：
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>閲覧数</li>
                <li>いいね</li>
                <li>お気に入り</li>
                <li>コメント</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              本当によろしいですか？
            </p>
          </div>
        ),
        confirmText: '移動する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (!confirmed) {
        return;
      }

      setIsMovingToTrash(true);
      setTrashProgress(0);
      setTrashMessage('ファイルをコピー中... → Next: 元のファイルを削除');

      try {
        const originalPath = buildFullPath(folder, undefined);
        const requestData = {
          type: 'folder',
          original_id: folder.id,
          original_path: originalPath,
          original_name: folder.name,
          user_id: user.id,
          original_folder_path: folder.path || '',
        };

        // 簡易的なプログレスバー（ファイルコピー/削除の進捗は正確に取得できないため）
        const progressInterval = setInterval(() => {
          setTrashProgress((prev) => {
            const newProgress = prev + 5; // 5%ずつ増加

            // ステップに応じてメッセージを更新
            if (newProgress >= 80 && prev < 80) {
              setTrashMessage('SQLiteから削除中... → Next: 完了');
            } else if (newProgress >= 50 && prev < 50) {
              setTrashMessage('元のファイルを削除中... → Next: SQLiteから削除');
            } else if (newProgress >= 20 && prev < 20) {
              setTrashMessage('ファイルをコピー中... → Next: 元のファイルを削除');
            }

            if (newProgress >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return newProgress;
          });
        }, 200); // 200msごとに更新

        const response = await fetch('/api/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });

        clearInterval(progressInterval);
        setTrashProgress(100);
        setTrashMessage('完了');

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            onSuccess?.();
          } else {
            onError?.('ゴミ箱への移動に失敗しました');
          }
        } else {
          onError?.('ゴミ箱への移動に失敗しました');
        }
      } catch (err) {
        console.error('ゴミ箱への移動エラー:', err);
        onError?.('ゴミ箱への移動に失敗しました');
      } finally {
        setIsMovingToTrash(false);
        setTrashProgress(0);
        setTrashMessage('ゴミ箱に移動中...');
      }
    },
    [user, buildFullPath, onSuccess, onError, confirmDialog]
  );

  return {
    isMovingToTrash,
    trashProgress,
    trashMessage,
    moveMaterialToTrash,
    moveFolderToTrash,
  };
}

