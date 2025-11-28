// 資料一覧表示コンポーネント（リストビュー）

import MaterialListItem from '@/components/MaterialListItem';
import type { MaterialNormalized } from '@/features/materials/types';

interface MaterialListViewProps {
  materials: MaterialNormalized[];
  onMaterialClick: (material: MaterialNormalized) => void;
  onBookmark?: (materialId: string) => void;
  bookmarkedIds: Set<string>;
  onCommentClick?: (material: MaterialNormalized) => void;
  creatorCache: Map<string, any>;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onContextMenu: (e: React.MouseEvent, material: MaterialNormalized) => void;
}

export default function MaterialListView({
  materials,
  onMaterialClick,
  onBookmark,
  bookmarkedIds,
  onCommentClick,
  creatorCache,
  onLikesUpdate,
  onContextMenu,
}: MaterialListViewProps) {
  return (
    <>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        資料 ({materials.length}件)
      </h4>
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-4 items-center px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-0">
        <div>名前</div>
        <div>作成者</div>
        <div>更新日時</div>
        <div></div>
      </div>
      <div className="space-y-3">
        {materials.map((material) => (
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
        ))}
      </div>
    </>
  );
}

