// フォルダ一覧表示コンポーネント（リストビュー）

import { Folder } from 'lucide-react';
import type { FolderEntry, FolderNormalized } from '@/features/materials/types';

interface FolderListViewProps {
  entries: FolderEntry[];
  folders: FolderNormalized[];
  onFolderClick: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, folder: FolderNormalized) => void;
  formatDate: (dateString: string) => string;
}

export default function FolderListView({
  entries,
  folders,
  onFolderClick,
  onContextMenu,
  formatDate,
}: FolderListViewProps) {
  return (
    <>
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-4 items-center px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-0">
        <div>名前</div>
        <div>作成者</div>
        <div>更新日時</div>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => {
          const folder = folders.find((f) => f.id === entry.id);
          if (!folder) return null;

          return (
            <div
              key={entry.id}
              data-folder-item
              className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-4 items-center px-5 py-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer transition-all"
              onClick={() => onFolderClick(entry.path)}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, folder);
              }}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Folder className="w-6 h-6 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                    {entry.name}
                  </p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-base text-gray-600 dark:text-gray-400">-</p>
              </div>
              <div className="min-w-0">
                <p className="text-base text-gray-600 dark:text-gray-400">
                  {folder?.created_date ? formatDate(folder.created_date) : '-'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

