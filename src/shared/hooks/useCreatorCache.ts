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
      users.forEach((user, sid) => {
        const cachedUser = prevCache.get(sid);
        // キャッシュにない、または更新されている場合は更新
        if (!cachedUser || cachedUser !== user) {
          newCache.set(sid, user);
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
        const creatorSids = new Set(
          materials
            .map((m) => m.created_by)
            .filter((sid): sid is string => Boolean(sid))
        );

        if (creatorSids.size === 0) {
          return;
        }

        const sidsToFetch = Array.from(creatorSids).filter(
          (sid) => !creatorCacheRef.current.has(sid)
        );

        if (sidsToFetch.length === 0) {
          return;
        }

        const fetched = await getUsers(sidsToFetch);

        setCreatorCache((prevCache) => {
          const newCache = new Map(prevCache);
          fetched.forEach((user, sid) => {
            if (user) {
              newCache.set(sid, user);
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

