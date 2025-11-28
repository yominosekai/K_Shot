// 資料リストアイテムコンポーネント

'use client';

import { FileText, Heart, Eye, ThumbsUp, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useMaterialLikes } from '@/shared/hooks/useMaterialLikes';
import { useUsers } from '@/contexts/UsersContext';
import type { MaterialNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';

interface MaterialListItemProps {
  material: MaterialNormalized;
  onClick: () => void;
  onBookmark?: (materialId: string) => void;
  isBookmarked?: boolean;
  onCommentClick?: (materialId: string) => void;
  creatorCache?: Map<string, User>; // 作成者情報のキャッシュ
  onLikesUpdate?: (materialId: string, likes: number) => void;
}

export default function MaterialListItem({
  material,
  onClick,
  onBookmark,
  isBookmarked = false,
  onCommentClick,
  creatorCache,
  onLikesUpdate,
}: MaterialListItemProps) {
  const { likes, isLiked, isLoading, toggleLike } = useMaterialLikes({
    materialId: material.id,
    initialLikes: material.likes,
    material,
    onLikesUpdate: (newLikes) => {
      onLikesUpdate?.(material.id, newLikes);
    },
  });
  const { getAvatarUrl } = useUsers();
  // キャッシュから作成者情報を取得
  const creator = material.created_by && creatorCache
    ? creatorCache.get(material.created_by) || null
    : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-4 items-center px-5 py-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer transition-all"
      onClick={onClick}
    >
      {/* 名前 */}
      <div className="flex items-center space-x-3 min-w-0">
        <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
            {material.title}
          </p>
        </div>
      </div>

      {/* 作成者 */}
      <div className="flex items-center space-x-2 min-w-0">
        {creator ? (
          <>
            {/* アバター */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 flex-shrink-0">
              {(() => {
                const creatorId = creator.id ?? creator.sid;
                const avatarUrl = creatorId ? getAvatarUrl(creatorId) : null;
                return avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={creator.display_name || 'Avatar'}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized={false}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>
                    {creator.display_name?.charAt(0).toUpperCase() || creator.sid?.charAt(0).toUpperCase() || 'U'}
                  </span>
                );
              })()}
            </div>
            {/* 表示名 */}
            <p className="text-base text-gray-600 dark:text-gray-400 truncate">
              {creator.display_name || creator.sid || '-'}
            </p>
          </>
        ) : (
          <p className="text-base text-gray-600 dark:text-gray-400 truncate">
            {material.created_by || '-'}
          </p>
        )}
      </div>

      {/* 更新日時 */}
      <div className="min-w-0">
        <p className="text-base text-gray-600 dark:text-gray-400">
          {formatDate(material.updated_date)}
        </p>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* いいねボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike();
          }}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          aria-label={isLiked ? 'いいねを解除' : 'いいねする'}
        >
          <ThumbsUp
            className={`w-6 h-6 ${
              isLiked
                ? 'fill-blue-500 text-blue-500'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          />
        </button>
        {/* お気に入りボタン */}
        {onBookmark && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(material.id);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
            aria-label={isBookmarked ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Heart
              className={`w-6 h-6 ${
                isBookmarked
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
          </button>
        )}
        {/* コメントボタン */}
        {onCommentClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick(material.id);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0 flex items-center space-x-1"
            aria-label="コメント"
          >
            <MessageCircle className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {material.comment_count ?? 0}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

