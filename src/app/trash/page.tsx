'use client';

import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, X, Download, Folder, FileText } from 'lucide-react';
import Toast from '@/components/Toast';
import TrashProgressModal from '@/components/TrashProgressModal';
import { useFolders } from '@/contexts/FoldersContext';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface TrashItem {
  id: string;
  type: 'material' | 'folder';
  original_id: string;
  original_path: string;
  original_name: string;
  trash_name: string;
  deleted_by: string;
  deleted_date: string;
  original_folder_path?: string;
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreMessage, setRestoreMessage] = useState<string>('復元中...');
  const { invalidateCache: invalidateFoldersCache, fetchFolders } = useFolders();
  const router = useRouter();
  const confirmDialog = useConfirmDialog();

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trash');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setItems(data.items || []);
        }
      }
    } catch (err) {
      console.error('ゴミ箱一覧の取得に失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (trashId: string) => {
    // 復元対象のアイテムを取得
    const item = items.find((i) => i.id === trashId);
    if (!item) {
      setToastMessage('アイテムが見つかりません');
      setIsToastVisible(true);
      return;
    }

    const itemName = item.trash_name;
    const itemType = item.type === 'folder' ? 'フォルダ' : '資料';
    const confirmMessage = `${itemType}「${itemName}」を復元しますか？\n\n復元先に同名の${itemType}が存在する場合、復元は中断されます。`;

    const confirmed = await confirmDialog({
      title: `${itemType}の復元`,
      message: confirmMessage,
      confirmText: '復元する',
      cancelText: 'キャンセル',
    });

    if (!confirmed) {
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreMessage('競合チェック中... → Next: ファイルを復元');

    try {
      // 簡易的なプログレスバー（ファイル復元/SQLite復元の進捗は正確に取得できないため）
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => {
          const newProgress = prev + 5; // 5%ずつ増加

          // ステップに応じてメッセージを更新
          if (newProgress >= 80 && prev < 80) {
            setRestoreMessage('SQLiteに復元中... → Next: 完了');
          } else if (newProgress >= 50 && prev < 50) {
            setRestoreMessage('ファイルを復元中... → Next: SQLiteに復元');
          } else if (newProgress >= 20 && prev < 20) {
            setRestoreMessage('競合チェック中... → Next: ファイルを復元');
          }

          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 200); // 200msごとに更新

      const response = await fetch(`/api/trash/${trashId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      clearInterval(progressInterval);
      setRestoreProgress(100);
      setRestoreMessage('完了');

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 少し待ってから完了メッセージを表示
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          setToastMessage('復元が完了しました');
          setIsToastVisible(true);
          fetchTrashItems();
          
          // フォルダキャッシュを無効化して再取得
          invalidateFoldersCache();
          await fetchFolders(true);
          
          // ページをリロードして最新の状態を反映
          router.refresh();
        } else {
          // エラーメッセージを表示（競合エラーの場合など）
          setToastMessage(data.error || '復元に失敗しました');
          setIsToastVisible(true);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: '復元に失敗しました' }));
        setToastMessage(errorData.error || '復元に失敗しました');
        setIsToastVisible(true);
      }
    } catch (err) {
      console.error('復元エラー:', err);
      setToastMessage('復元に失敗しました');
      setIsToastVisible(true);
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreMessage('復元中...');
    }
  };

  const handleDelete = async (trashId: string) => {
    const confirmed = await confirmDialog({
      title: '完全削除',
      message: '完全に削除しますか？この操作は取り消せません。',
      confirmText: '完全削除する',
      cancelText: 'キャンセル',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/trash/${trashId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setToastMessage('完全削除が完了しました');
          setIsToastVisible(true);
          fetchTrashItems();
        }
      } else {
        setToastMessage('完全削除に失敗しました');
        setIsToastVisible(true);
      }
    } catch (err) {
      console.error('完全削除エラー:', err);
      setToastMessage('完全削除に失敗しました');
      setIsToastVisible(true);
    }
  };

  const handleDownload = async (trashId: string) => {
    try {
      const response = await fetch(`/api/trash/${trashId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.path) {
          setToastMessage('ダウンロード機能は準備中です');
          setIsToastVisible(true);
          // TODO: ZIP化してダウンロード
        }
      }
    } catch (err) {
      console.error('ダウンロードエラー:', err);
      setToastMessage('ダウンロードに失敗しました');
      setIsToastVisible(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Trash2 className="w-6 h-6" />
          <span>ゴミ箱</span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          削除されたファイルとフォルダが表示されます。復元、完全削除、ダウンロードが可能です。
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">ゴミ箱は空です</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {item.type === 'folder' ? (
                  <Folder className="w-8 h-8 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="w-8 h-8 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.trash_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    元のパス: {item.original_path}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    削除日時: {formatDate(item.deleted_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleRestore(item.id)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  title="復元"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>復元</span>
                </button>
                <button
                  onClick={() => handleDownload(item.id)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                  title="ダウンロード"
                >
                  <Download className="w-4 h-4" />
                  <span>ダウンロード</span>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="完全削除"
                >
                  <X className="w-4 h-4" />
                  <span>完全削除</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />

      {/* 復元プログレスバー */}
      <TrashProgressModal
        isVisible={isRestoring}
        progress={restoreProgress}
        message={restoreMessage}
      />
    </div>
  );
}

