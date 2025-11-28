// フォルダプロパティモーダルコンポーネント

'use client';

import { X } from 'lucide-react';
import type { FolderNormalized } from '@/features/materials/types';

interface FolderPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderNormalized | null;
}

export default function FolderPropertiesModal({
  isOpen,
  onClose,
  folder,
}: FolderPropertiesModalProps) {
  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">フォルダのプロパティ</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              フォルダ名
            </label>
            <p className="text-gray-900 dark:text-gray-100">{folder.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              パス
            </label>
            <p className="text-gray-900 dark:text-gray-100 break-all">{folder.path || '/'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              作成日時
            </label>
            <p className="text-gray-900 dark:text-gray-100">
              {new Date(folder.created_date).toLocaleString('ja-JP')}
            </p>
          </div>

          {folder.created_by_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                作成者
              </label>
              <p className="text-gray-900 dark:text-gray-100">{folder.created_by_name}</p>
            </div>
          )}

          {folder.material_count !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                資料数
              </label>
              <p className="text-gray-900 dark:text-gray-100">{folder.material_count}件</p>
            </div>
          )}
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

