// フォルダ一覧表示コンポーネント（グリッドビュー）

import { Folder, ChevronRight } from 'lucide-react';
import type { FolderEntry, FolderNormalized } from '@/features/materials/types';

interface FolderGridViewProps {
  entries: FolderEntry[];
  folders: FolderNormalized[];
  onFolderClick: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, folder: FolderNormalized) => void;
}

export default function FolderGridView({
  entries,
  folders,
  onFolderClick,
  onContextMenu,
}: FolderGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map((entry) => {
        const folder = folders.find((f) => f.id === entry.id);
        if (!folder) return null;

        return (
          <button
            key={entry.id}
            data-folder-item
            onClick={() => onFolderClick(entry.path)}
            onContextMenu={(e) => {
              e.stopPropagation();
              onContextMenu(e, folder);
            }}
            className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <Folder className="w-8 h-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {entry.name}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
