// 汎用プログレスバーモーダルコンポーネント

import { Loader2 } from 'lucide-react';

interface ProgressModalProps {
  isVisible: boolean;
  progress: number; // 0-100
  message: string; // 詳細メッセージ
  title?: string; // タイトル（デフォルト: "処理中..."）
  zIndex?: number; // z-index（デフォルト: 50）
}

export default function ProgressModal({
  isVisible,
  progress,
  message,
  title = '処理中...',
  zIndex = 50,
}: ProgressModalProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      style={{ zIndex }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 min-w-[400px]">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

