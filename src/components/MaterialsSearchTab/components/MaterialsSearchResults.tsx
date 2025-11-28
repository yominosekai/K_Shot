// 資料検索結果表示コンポーネント

'use client';

import MaterialCard from '@/components/MaterialCard';
import MaterialListItem from '@/components/MaterialListItem';
import type { MaterialNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';

interface MaterialsSearchResultsProps {
  viewMode: 'grid' | 'list';
  materials: MaterialNormalized[];
  bookmarkedIds: Set<string>;
  creatorCache: Map<string, User>;
  onMaterialClick: (material: MaterialNormalized) => void;
  onBookmark: (materialId: string) => void;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onBookmarksUpdate?: (materialId: string, bookmarks: number) => void;
  onCommentClick?: (material: MaterialNormalized) => void;
  onContextMenu: (e: React.MouseEvent, material: MaterialNormalized) => void;
  searchTerm: string;
  selectedCategory: string;
  selectedType: string;
}

export default function MaterialsSearchResults({
  viewMode,
  materials,
  bookmarkedIds,
  creatorCache,
  onMaterialClick,
  onBookmark,
  onLikesUpdate,
  onBookmarksUpdate,
  onCommentClick,
  onContextMenu,
  searchTerm,
  selectedCategory,
  selectedType,
}: MaterialsSearchResultsProps) {
  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm || selectedCategory || selectedType
            ? '条件に一致する資料が見つかりませんでした'
            : '資料がありません'}
        </p>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'list' && (
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-4 items-center px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-0">
          <div>名前</div>
          <div>作成者</div>
          <div>更新日時</div>
          <div></div>
        </div>
      )}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-3'
        }
      >
        {materials.map((material) =>
          viewMode === 'grid' ? (
            <div
              key={material.id}
              data-material-item
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, material);
              }}
            >
              <MaterialCard
                material={material}
                onClick={() => onMaterialClick(material)}
                onBookmark={onBookmark}
                isBookmarked={bookmarkedIds.has(material.id)}
                onLikesUpdate={onLikesUpdate}
                onBookmarksUpdate={onBookmarksUpdate}
                onCommentClick={onCommentClick ? () => onCommentClick(material) : undefined}
              />
            </div>
          ) : (
            <div
              key={material.id}
              data-material-item
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, material);
              }}
            >
              <MaterialListItem
                material={material}
                onClick={() => onMaterialClick(material)}
                onBookmark={onBookmark}
                isBookmarked={bookmarkedIds.has(material.id)}
                onCommentClick={onCommentClick ? (materialId) => onCommentClick(material) : undefined}
                creatorCache={creatorCache}
                onLikesUpdate={onLikesUpdate}
              />
            </div>
          )
        )}
      </div>
    </>
  );
}


