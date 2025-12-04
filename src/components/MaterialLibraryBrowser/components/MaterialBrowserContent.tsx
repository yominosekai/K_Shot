// 資料ブラウザのコンテンツ表示部分

'use client';

import FolderListView from './FolderListView';
import FolderGridView from './FolderGridView';
import MaterialListView from './MaterialListView';
import MaterialGridView from './MaterialGridView';
import EmptyState from './EmptyState';
import type { FolderEntry, FolderNormalized, MaterialNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';

interface MaterialBrowserContentProps {
  viewMode: 'grid' | 'list';
  entries: FolderEntry[];
  folders: FolderNormalized[];
  materials: MaterialNormalized[];
  loading: boolean;
  currentPath: string | null;
  bookmarkedIds: Set<string>;
  creatorCache: Map<string, User>;
  onFolderClick: (path: string) => void;
  onMaterialClick: (material: MaterialNormalized) => void;
  onBookmark?: (materialId: string) => void;
  onCommentClick?: (material: MaterialNormalized) => void;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onContextMenu: (e: React.MouseEvent, folder?: FolderNormalized, material?: MaterialNormalized) => void;
  formatDate: (dateString: string) => string;
}

export default function MaterialBrowserContent({
  viewMode,
  entries,
  folders,
  materials,
  loading,
  currentPath,
  bookmarkedIds,
  creatorCache,
  onFolderClick,
  onMaterialClick,
  onBookmark,
  onCommentClick,
  onLikesUpdate,
  onContextMenu,
  formatDate,
}: MaterialBrowserContentProps) {
  // ローディング
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  // エントリ一覧
  return (
    <div
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        const isOnFolder = target.closest('button[data-folder-item]');
        const isOnMaterial = target.closest('[data-material-item]');
        if (!isOnFolder && !isOnMaterial) {
          onContextMenu(e);
        }
      }}
      className="flex-1 w-full"
    >
      {/* フォルダ一覧 */}
      {entries.length > 0 && (
        <div className="mb-4 mt-1">
          {viewMode === 'list' ? (
            <FolderListView
              entries={entries}
              folders={folders}
              onFolderClick={onFolderClick}
              onContextMenu={(e, folder) => onContextMenu(e, folder)}
              formatDate={formatDate}
            />
          ) : (
            <FolderGridView
              entries={entries}
              folders={folders}
              onFolderClick={onFolderClick}
              onContextMenu={(e, folder) => onContextMenu(e, folder)}
            />
          )}
        </div>
      )}

      {/* 資料一覧 */}
      {materials.length > 0 && (
        <div>
          {viewMode === 'list' ? (
            <MaterialListView
              materials={materials}
              onMaterialClick={onMaterialClick}
              onBookmark={onBookmark}
              bookmarkedIds={bookmarkedIds}
              onCommentClick={onCommentClick}
              creatorCache={creatorCache}
              onLikesUpdate={onLikesUpdate}
              onContextMenu={(e, material) => onContextMenu(e, undefined, material)}
            />
          ) : (
            <MaterialGridView
              materials={materials}
              onMaterialClick={onMaterialClick}
              onBookmark={onBookmark}
              bookmarkedIds={bookmarkedIds}
              onCommentClick={onCommentClick}
              onLikesUpdate={onLikesUpdate}
              onContextMenu={(e, material) => onContextMenu(e, undefined, material)}
            />
          )}
        </div>
      )}

      {/* 空状態 */}
      {entries.length === 0 && materials.length === 0 && (
        <EmptyState currentPath={currentPath} />
      )}
    </div>
  );
}


