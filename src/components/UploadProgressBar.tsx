// アップロードプログレスバーコンポーネント

import { Loader2 } from 'lucide-react';

interface UploadProgressBarProps {
  isVisible: boolean;
  progress: number;
  message: string;
}

export default function UploadProgressBar({
  isVisible,
  progress,
  message,
}: UploadProgressBarProps) {
  if (!isVisible || !message) {
    return null;
  }

  return (
    <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {message}
            </span>
          </div>
          {progress > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400">{progress}%</span>
          )}
        </div>
        {/* プログレスバー */}
        {progress > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

