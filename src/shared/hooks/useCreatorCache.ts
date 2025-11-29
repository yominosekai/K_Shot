// 作成者情報キャッシュのカスタムフック

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@/features/auth/types';
import type { MaterialNormalized } from '@/features/materials/types';
import { useUsers } from '@/contexts/UsersContext';

export function useCreatorCache() {
  const [creatorCache, setCreatorCache] = useState<Map<string, User>>(new Map());
  const creatorCacheRef = useRef<Map<string, User>>(new Map());
  const { getUsers, users } = useUsers();

  // キャッシュをrefと同期
  useEffect(() => {
    creatorCacheRef.current = creatorCache;
  }, [creatorCache]);

  // UsersContextの更新を監視して、creatorCacheを自動更新
  useEffect(() => {
    setCreatorCache((prevCache) => {
      const newCache = new Map(prevCache);
      let hasChanges = false;

      // UsersContextに存在するユーザー情報でcreatorCacheを更新
      users.forEach((user, id) => {
        const cachedUser = prevCache.get(id);
        // キャッシュにない、または更新されている場合は更新
        if (!cachedUser || cachedUser !== user) {
          newCache.set(id, user);
          hasChanges = true;
        }
      });

      return hasChanges ? newCache : prevCache;
    });
  }, [users]);

  // 作成者情報を一括取得してキャッシュに保存
  const fetchCreators = useCallback(
    async (materials: MaterialNormalized[]) => {
      try {
        const creatorIds = new Set(
          materials
            .map((m) => m.created_by)
            .filter((id): id is string => Boolean(id))
        );

        if (creatorIds.size === 0) {
          return;
        }

        const idsToFetch = Array.from(creatorIds).filter(
          (id) => !creatorCacheRef.current.has(id)
        );

        if (idsToFetch.length === 0) {
          return;
        }

        const fetched = await getUsers(idsToFetch);

        setCreatorCache((prevCache) => {
          const newCache = new Map(prevCache);
          fetched.forEach((user, id) => {
            if (user) {
              newCache.set(id, user);
            }
          });
          return newCache;
        });
      } catch (err) {
        console.error('[useCreatorCache] 作成者情報一括取得エラー:', err);
      }
    },
    [getUsers]
  );

  return {
    creatorCache,
    setCreatorCache,
    fetchCreators,
  };
}

