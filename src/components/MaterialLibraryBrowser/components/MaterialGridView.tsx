// 資料一覧表示コンポーネント（グリッドビュー）

import MaterialCard from '@/components/MaterialCard';
import type { MaterialNormalized } from '@/features/materials/types';

interface MaterialGridViewProps {
  materials: MaterialNormalized[];
  onMaterialClick: (material: MaterialNormalized) => void;
  onBookmark?: (materialId: string) => void;
  bookmarkedIds: Set<string>;
  onCommentClick?: (material: MaterialNormalized) => void;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onContextMenu: (e: React.MouseEvent, material: MaterialNormalized) => void;
}

export default function MaterialGridView({
  materials,
  onMaterialClick,
  onBookmark,
  bookmarkedIds,
  onCommentClick,
  onLikesUpdate,
  onContextMenu,
}: MaterialGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {materials.map((material) => (
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
            onCommentClick={onCommentClick ? () => onCommentClick(material) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
