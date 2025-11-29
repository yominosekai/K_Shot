// コメント取得フック

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UsersContext';
import type { MaterialCommentNormalized } from '@/features/comments/types';
import type { MaterialNormalized } from '@/features/materials/types';

export function useComments(material: MaterialNormalized | null, isOpen: boolean) {
  const { user } = useAuth();
  const { getUsers: getUsersFromContext } = useUsers();
  const [comments, setComments] = useState<MaterialCommentNormalized[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCache, setUserCache] = useState<Map<string, any>>(new Map());

  const fetchComments = useCallback(async () => {
    if (!material || !user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/materials/${material.id}/comments?user_id=${user.id}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setComments(data.comments || []);

          // ユーザー情報を一括取得
          const userIds = new Set<string>();
          (data.comments || []).forEach((comment: MaterialCommentNormalized) => {
            if (comment.created_by) {
              userIds.add(comment.created_by);
            }
            (comment.replies || []).forEach((reply: MaterialCommentNormalized) => {
              if (reply.created_by) {
                userIds.add(reply.created_by);
              }
            });
          });

          if (userIds.size > 0) {
            const users = await getUsersFromContext(Array.from(userIds));
            const newCache = new Map<string, any>();
            users.forEach((u, userId) => {
              if (u) {
                newCache.set(userId, u);
              }
            });
            setUserCache(newCache);
          }
        }
      }
    } catch (err) {
      console.error('コメント取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [material, user?.id, getUsersFromContext]);

  useEffect(() => {
    if (isOpen && material) {
      fetchComments();
    } else {
      setComments([]);
      setUserCache(new Map());
    }
  }, [isOpen, material, fetchComments]);

  return { comments, loading, userCache, refetch: fetchComments };
}



