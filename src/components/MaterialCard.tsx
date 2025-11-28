// 資料カードコンポーネント

'use client';

import { FileText, Eye, Heart, Calendar, ThumbsUp, MessageCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useMaterialLikes } from '@/shared/hooks/useMaterialLikes';
import type { MaterialNormalized } from '@/features/materials/types';

interface MaterialCardProps {
  material: MaterialNormalized;
  onClick: () => void;
  onBookmark?: (materialId: string) => void;
  isBookmarked?: boolean;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onBookmarksUpdate?: (materialId: string, bookmarks: number) => void;
  onCommentClick?: (materialId: string) => void;
}

export default function MaterialCard({
  material,
  onClick,
  onBookmark,
  isBookmarked = false,
  onLikesUpdate,
  onBookmarksUpdate,
  onCommentClick,
}: MaterialCardProps) {
  const { likes, isLiked, isLoading, toggleLike } = useMaterialLikes({
    materialId: material.id,
    initialLikes: material.likes,
    material,
    onLikesUpdate: (newLikes) => {
      onLikesUpdate?.(material.id, newLikes);
    },
  });
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(material.bookmark_count ?? 0);

  // お気に入り数が更新されたときに状態を更新
  useEffect(() => {
    setBookmarkCount(material.bookmark_count ?? 0);
  }, [material.bookmark_count]);

  // コメント数
  const commentCount = material.comment_count ?? 0;

  // お気に入りをクリック
  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onBookmark || isBookmarkLoading) {
      return;
    }

    setIsBookmarkLoading(true);
    const previousBookmarkCount = bookmarkCount;

    // 楽観的更新
    const newBookmarkCount = isBookmarked
      ? Math.max(0, bookmarkCount - 1)
      : bookmarkCount + 1;
    setBookmarkCount(newBookmarkCount);

    try {
      // onBookmarkは非同期関数なのでawait
      if (onBookmark) {
        await onBookmark(material.id);
      }
      // お気に入り数を再取得（個別APIで取得）
      try {
        const response = await fetch(`/api/materials/${material.id}/bookmarks-count`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const actualCount = data.count ?? 0;
            setBookmarkCount(actualCount);
            onBookmarksUpdate?.(material.id, actualCount);
          } else {
            // エラー時は元に戻す
            setBookmarkCount(previousBookmarkCount);
          }
        } else {
          // エラー時は元に戻す
          setBookmarkCount(previousBookmarkCount);
        }
      } catch (err) {
        console.error('お気に入り数再取得エラー:', err);
        // エラー時は元に戻す
        setBookmarkCount(previousBookmarkCount);
      }
    } catch (err) {
      console.error('お気に入り更新エラー:', err);
      // エラー時は元に戻す
      setBookmarkCount(previousBookmarkCount);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="w-4 h-4" />;
  };

  // 新着・更新バッジの判定
  const getBadgeInfo = () => {
    const now = Date.now();
    const createdDate = new Date(material.created_date).getTime();
    const updatedDate = new Date(material.updated_date).getTime();
    
    const daysSinceCreated = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    const daysSinceUpdated = Math.floor((now - updatedDate) / (1000 * 60 * 60 * 24));
    
    // 作成日から7日以内 → 「新着」
    if (daysSinceCreated <= 7) {
      return { type: 'new', label: '新着' };
    }
    
    // 新着の7日以降（作成日から7日以上経過）かつ、更新日が作成日より新しく、かつ更新日から7日以内 → 「更新」
    if (daysSinceCreated > 7 && updatedDate > createdDate && daysSinceUpdated <= 7) {
      return { type: 'updated', label: '更新' };
    }
    
    return null;
  };
  
  const badgeInfo = getBadgeInfo();

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 relative overflow-hidden"
      onClick={onClick}
    >
      {/* 新着・更新バッジ */}
      {badgeInfo && (
        <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full z-10 ${
          badgeInfo.type === 'new' 
            ? 'bg-green-500' 
            : 'bg-blue-500'
        }`}>
          {badgeInfo.label}
        </div>
      )}

      <div className="p-6">
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {getTypeIcon(material.type)}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg line-clamp-2">
              {material.title}
            </h3>
          </div>
        </div>

        {/* 説明 */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {material.description}
        </p>

        {/* メタ情報 */}
        <div className="space-y-2 mb-4">
          {material.category_name && (
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {material.category_name}
              </span>
            </div>
          )}

          {/* タグ */}
          {material.tags && material.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {material.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
              {material.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{material.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{material.views}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              disabled={isLoading}
              className="flex items-center space-x-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
              aria-label={isLiked ? 'いいねを解除' : 'いいねする'}
            >
              <ThumbsUp
                className={`w-4 h-4 ${
                  isLiked
                    ? 'fill-blue-500 text-blue-500'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span>{likes}</span>
            </button>
            <button
              onClick={handleBookmarkClick}
              disabled={!onBookmark || isBookmarkLoading}
              className="flex items-center space-x-1 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label={isBookmarked ? 'お気に入りから削除' : 'お気に入りに追加'}
            >
              <Heart
                className={`w-4 h-4 ${
                  isBookmarked
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span>{bookmarkCount}</span>
            </button>
            {onCommentClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCommentClick(material.id);
                }}
                className="flex items-center space-x-1 hover:text-green-500 dark:hover:text-green-400 transition-colors"
                aria-label="コメント"
              >
                <MessageCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>{commentCount}</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(material.updated_date)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

