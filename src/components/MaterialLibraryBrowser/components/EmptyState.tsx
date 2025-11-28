// 空状態表示コンポーネント

import { FileText } from 'lucide-react';

interface EmptyStateProps {
  currentPath: string | null;
}

export default function EmptyState({ currentPath }: EmptyStateProps) {
  return (
    <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center">
      <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <p className="text-gray-500 dark:text-gray-400">
        {currentPath ? 'このフォルダには資料がありません' : '資料がありません'}
      </p>
    </div>
  );
}
