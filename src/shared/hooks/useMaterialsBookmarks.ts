// お気に入り管理フック

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useMaterialsBookmarks() {
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // お気に入り一覧を取得
  const fetchBookmarks = useCallback(async () => {
    if (!user?.sid) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.sid}/bookmarks`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.bookmarks)) {
          setBookmarkedIds(new Set(data.bookmarks));
        }
      }
    } catch (err) {
      console.error('お気に入り取得エラー:', err);
    }
  }, [user?.sid]);

  // 初回読み込み時およびuser.sidが変更された時にお気に入りを取得
  useEffect(() => {
    if (user?.sid) {
      fetchBookmarks();
    }
  }, [user?.sid, fetchBookmarks]); // user.sidとfetchBookmarksを依存配列に含める

  // お気に入り切り替え（永続化）
  const handleBookmark = useCallback(
    async (materialId: string) => {
      if (!user?.sid) {
        return;
      }

      const isBookmarked = bookmarkedIds.has(materialId);
      const newSet = new Set(bookmarkedIds);

      // 楽観的更新
      if (isBookmarked) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      setBookmarkedIds(newSet);

      // APIで永続化
      try {
        if (isBookmarked) {
          // 削除
          const response = await fetch(`/api/users/${user.sid}/bookmarks`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ material_id: materialId }),
          });
          if (!response.ok) {
            // エラー時は元に戻す
            setBookmarkedIds(bookmarkedIds);
          }
        } else {
          // 追加
          const response = await fetch(`/api/users/${user.sid}/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ material_id: materialId }),
          });
          if (!response.ok) {
            // エラー時は元に戻す
            setBookmarkedIds(bookmarkedIds);
          }
        }
      } catch (err) {
        console.error('お気に入り更新エラー:', err);
        // エラー時は元に戻す
        setBookmarkedIds(bookmarkedIds);
      }
    },
    [user?.sid, bookmarkedIds]
  );

  return {
    bookmarkedIds,
    fetchBookmarks,
    handleBookmark,
  };
}

