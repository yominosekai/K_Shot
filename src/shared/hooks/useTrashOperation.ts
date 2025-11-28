'use client';

// ゴミ箱操作のカスタムフック

import { useState, useCallback } from 'react';
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
      if (!user?.sid) {
        onError?.('ユーザー情報が取得できません');
        return;
      }

      const confirmed = await confirmDialog({
        title: '資料をゴミ箱に移動',
        message: `資料「${material.title}」をゴミ箱に移動しますか？`,
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
            user_sid: user.sid,
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
      if (!user?.sid) {
        onError?.('ユーザー情報が取得できません');
        return;
      }

      const confirmed = await confirmDialog({
        title: 'フォルダをゴミ箱に移動',
        message: `フォルダ「${folder.name}」をゴミ箱に移動しますか？`,
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
          user_sid: user.sid,
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

