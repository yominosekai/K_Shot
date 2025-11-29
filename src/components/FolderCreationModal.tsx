// フォルダ作成モーダルコンポーネント

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { FolderNormalized } from '@/features/materials/types';

interface FolderCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPath?: string; // 現在表示しているフォルダのパス
}

export default function FolderCreationModal({
  isOpen,
  onClose,
  onSuccess,
  currentPath = '',
}: FolderCreationModalProps) {
  const { user } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [parentId, setParentId] = useState('');
  const [folders, setFolders] = useState<FolderNormalized[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const folderNameInputRef = useRef<HTMLInputElement>(null);

  // フォルダ一覧を取得
  useEffect(() => {
    if (isOpen) {
      const fetchFolders = async () => {
        try {
          const response = await fetch('/api/materials/folders?flat=true');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const allFolders = data.folders || [];
              setFolders(allFolders);
              
              // currentPathから親フォルダIDを自動設定
              if (currentPath) {
                const currentFolder = allFolders.find((f: FolderNormalized) => f.path === currentPath);
                if (currentFolder) {
                  setParentId(currentFolder.id);
                }
              } else {
                // ルートの場合は空文字列
                setParentId('');
              }
            }
          }
        } catch (err) {
          console.error('フォルダ取得エラー:', err);
        }
      };
      fetchFolders();
    }
  }, [isOpen, currentPath]);

  // モーダルが開かれたときにフォームをリセット
  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setIsCreating(false);
      setValidationError(null);
      setErrorModalMessage(null);
      // parentIdはcurrentPathから自動設定されるので、ここではリセットしない
      
      // フォルダ名入力欄に自動フォーカス（少し遅延を入れて確実にフォーカス）
      setTimeout(() => {
        folderNameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // フォルダ名のバリデーション
  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return null; // 空の場合はrequired属性で処理
    }

    // Windowsで使用できない文字をチェック
    const invalidChars = /[<>:"|?*\\\/]/;
    if (invalidChars.test(name)) {
      return 'フォルダ名に使用できない文字が含まれています: < > : " | ? * \\ /';
    }

    // 先頭・末尾のピリオドやスペースをチェック
    if (/^\.+|\.+$/.test(name) || /^ +| +$/.test(name)) {
      return 'フォルダ名の先頭・末尾にピリオドやスペースは使用できません';
    }

    return null;
  };

  const handleFolderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFolderName(value);
    setValidationError(validateFolderName(value));
  };

  // オートコンプリートで値が変更されたときにも状態を更新
  const handleFolderNameInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setFolderName(value);
    setValidationError(validateFolderName(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || !user?.id) return;

    // バリデーション
    const error = validateFolderName(folderName);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/materials/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parent_id: parentId || '',
          user_id: user.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        if (result.error === 'DATABASE_BUSY') {
          setErrorModalMessage('DATABASE_BUSYの為時間を空けて再度操作をお願いします。');
        } else {
          setErrorModalMessage(result.error || 'フォルダの作成に失敗しました。');
        }
      }
    } catch (err) {
      console.error('フォルダ作成エラー:', err);
      setErrorModalMessage('フォルダの作成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <FolderPlus className="w-5 h-5" />
            <span>新規フォルダ作成</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="folder-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              フォルダ名 <span className="text-red-500">*</span>
            </label>
            <input
              ref={folderNameInputRef}
              type="text"
              id="folder-name"
              name="folder-name"
              value={folderName}
              onChange={handleFolderNameChange}
              onInput={handleFolderNameInput}
              autoComplete="off"
              required
              placeholder="フォルダ名を入力"
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                validationError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
              }`}
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              使用できない文字: &lt; &gt; : &quot; | ? * \ /
            </p>
          </div>

          {currentPath && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                作成先
              </label>
              <div className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                {currentPath || 'ルート（最上位）'}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                現在表示しているフォルダ内に作成されます
              </p>
            </div>
          )}
          {!currentPath && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                作成先
              </label>
              <div className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                ルート（最上位）
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ルートに作成されます
              </p>
            </div>
          )}

          {/* フッター */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isCreating || !folderName.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
        </div>
      </div>
      {errorModalMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">エラー</h3>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {errorModalMessage}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setErrorModalMessage(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

