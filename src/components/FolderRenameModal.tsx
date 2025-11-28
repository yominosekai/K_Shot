// フォルダ名変更モーダルコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';
import type { FolderNormalized } from '@/features/materials/types';

interface FolderRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folder: FolderNormalized | null;
}

export default function FolderRenameModal({
  isOpen,
  onClose,
  onSuccess,
  folder,
}: FolderRenameModalProps) {
  const [folderName, setFolderName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // モーダルが開かれたときにフォルダ名を設定
  useEffect(() => {
    if (isOpen && folder) {
      setFolderName(folder.name);
      setIsRenaming(false);
      setValidationError(null);
    }
  }, [isOpen, folder]);

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
    if (!folder || !folderName.trim()) return;

    // バリデーション
    const error = validateFolderName(folderName);
    if (error) {
      setValidationError(error);
      return;
    }

    // 同じ名前の場合は何もしない
    if (folderName.trim() === folder.name) {
      onClose();
      return;
    }

    setIsRenaming(true);
    try {
      const response = await fetch(`/api/materials/folders/${folder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert('フォルダ名の変更に失敗しました: ' + (result.error || '不明なエラー'));
      }
    } catch (err) {
      console.error('フォルダ名変更エラー:', err);
      alert('フォルダ名の変更に失敗しました');
    } finally {
      setIsRenaming(false);
    }
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Edit className="w-5 h-5" />
            <span>フォルダ名を変更</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
            disabled={isRenaming}
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

          {/* フッター */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isRenaming}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isRenaming || !folderName.trim() || folderName.trim() === folder.name}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRenaming ? '変更中...' : '変更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

