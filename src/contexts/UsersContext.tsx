'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import type { User } from '@/features/auth/types';

interface UsersContextType {
  users: Map<string, User>;
  loading: boolean;
  error: string | null;
  getUser: (userId: string) => Promise<User | null>;
  getUsers: (userIds: string[]) => Promise<Map<string, User>>;
  setUser: (userId: string, user: User) => void;
  invalidateCache: (userId?: string, updateAvatarTimestamp?: boolean) => void;
  getAvatarUrl: (userId: string) => string | null;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

const CACHE_DURATION = 10 * 60 * 1000; // 10分
const STORAGE_KEY = 'users_cache';

interface UsersCachePayload {
  users: Record<string, User>;
  timestamps: Record<string, number>;
}

const defaultCachePayload: UsersCachePayload = {
  users: {},
  timestamps: {},
};

const now = () => Date.now();

function deserializeCache(): { users: Map<string, User>; timestamps: Map<string, number> } {
  if (typeof window === 'undefined') {
    return { users: new Map(), timestamps: new Map() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { users: new Map(), timestamps: new Map() };
    }

    const parsed: UsersCachePayload = { ...defaultCachePayload, ...JSON.parse(raw) };
    const users = new Map<string, User>();
    const timestamps = new Map<string, number>();
    const current = now();

    Object.entries(parsed.users).forEach(([userId, user]) => {
      const timestamp = parsed.timestamps[userId];
      if (!timestamp || current - timestamp < CACHE_DURATION) {
        users.set(userId, user);
        if (timestamp) {
          timestamps.set(userId, timestamp);
        }
      }
    });

    return { users, timestamps };
  } catch (err) {
    console.error('[UsersContext] キャッシュ読み込みエラー:', err);
    return { users: new Map(), timestamps: new Map() };
  }
}

function persistCache(users: Map<string, User>, timestamps: Map<string, number>) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: UsersCachePayload = { users: {}, timestamps: {} };
  users.forEach((user, userId) => {
    payload.users[userId] = user;
  });
  timestamps.forEach((timestamp, userId) => {
    payload.timestamps[userId] = timestamp;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('[UsersContext] キャッシュ保存エラー:', err);
  }
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamps, setCacheTimestamps] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const { users: loadedUsers, timestamps } = deserializeCache();
    if (loadedUsers.size > 0) {
      setUsers(loadedUsers);
    }
    if (timestamps.size > 0) {
      setCacheTimestamps(timestamps);
    }
  }, []);

  useEffect(() => {
    persistCache(users, cacheTimestamps);
  }, [users, cacheTimestamps]);

  // ユーザー情報を取得（キャッシュがあれば返す、なければ取得）
  const isFresh = useCallback(
    (timestamp?: number) => (timestamp ? now() - timestamp < CACHE_DURATION : false),
    []
  );

  const setUserWithTimestamp = useCallback((userId: string, user: User, timestamp = now()) => {
    setUsers((prev) => {
      const next = new Map(prev);
      next.set(userId, user);
      return next;
    });
    setCacheTimestamps((prev) => {
      const next = new Map(prev);
      next.set(userId, timestamp);
      return next;
    });
  }, []);

  const getUser = useCallback(
    async (userId: string): Promise<User | null> => {
      if (!userId) {
        return null;
      }

      const normalizedUserId = userId.trim();

      const cached = users.get(normalizedUserId);
      const timestamp = cacheTimestamps.get(normalizedUserId);
      if (cached && isFresh(timestamp)) {
        return cached;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/users/${encodeURIComponent(normalizedUserId)}`);
        if (!response.ok) {
          const errorMessage =
            response.status === 404 ? 'ユーザーが見つかりません' : 'ユーザー情報の取得に失敗しました';
          console.warn('[UsersContext] getUser fetch failed:', response.status, errorMessage);
          return null;
        }

        const data = await response.json();
        if (!data.success || !data.user) {
          return null;
        }

        const fetchedUser = data.user as User;
        setUserWithTimestamp(normalizedUserId, fetchedUser);
        return fetchedUser;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました';
        setError(errorMessage);
        console.error('[UsersContext] ユーザー情報取得エラー:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cacheTimestamps, isFresh, setUserWithTimestamp, users]
  );

  // 複数のユーザー情報を一括取得
  const getUsers = useCallback(
    async (userIds: string[]): Promise<Map<string, User>> => {
      const result = new Map<string, User>();
      const uncachedUserIds: string[] = [];

      // キャッシュから取得できるものを先に取得（refから最新の状態を取得）
      const now = Date.now();
      userIds.forEach((userId) => {
        if (!userId) {
          return;
        }
        const normalizedUserId = userId.trim();

        const cached = users.get(normalizedUserId);
        const timestamp = cacheTimestamps.get(normalizedUserId);

        if (cached && (!timestamp || now - timestamp < CACHE_DURATION)) {
          result.set(normalizedUserId, cached);
        } else {
          uncachedUserIds.push(normalizedUserId);
        }
      });

      // キャッシュにないものは並列で取得
      if (uncachedUserIds.length > 0) {
        const promises = uncachedUserIds.map((id) => getUser(id));
        const results = await Promise.all(promises);

        results.forEach((user, index) => {
          if (user) {
            result.set(uncachedUserIds[index], user);
          }
        });
      }

      return result;
    },
    [cacheTimestamps, getUser, users]
  );

  // ユーザー情報を直接設定（AuthContextから取得した情報を保存する場合など）
  const setUser = useCallback(
    (userId: string, user: User) => {
      if (!userId) return;
      const normalizedUserId = userId.trim();

      setUsers((prev) => {
        const next = new Map(prev);
        next.set(normalizedUserId, user);
        return next;
      });
    },
    []
  );

  // キャッシュを無効化
  // updateAvatarTimestamp: trueの場合、アバター更新時のみタイムスタンプを更新（URLを変更してブラウザキャッシュを無効化）
  // タイムスタンプは1時間後に自動削除され、固定URLに戻る
  const invalidateCache = useCallback(
    (userId?: string, updateAvatarTimestamp: boolean = false) => {
      if (userId) {
        const normalizedUserId = userId.trim();

        if (updateAvatarTimestamp) {
          setCacheTimestamps((prev) => {
            const next = new Map(prev);
            next.set(normalizedUserId, now());
            return next;
          });
          // 1時間後にタイムスタンプを自動削除（固定URLに戻す）
          setTimeout(() => {
            setCacheTimestamps((prev) => {
              const next = new Map(prev);
              next.delete(normalizedUserId);
              return next;
            });
          }, CACHE_DURATION);
          return;
        }

        setUsers((prev) => {
          const next = new Map(prev);
          next.delete(normalizedUserId);
          return next;
        });
        setCacheTimestamps((prev) => {
          const next = new Map(prev);
          next.delete(normalizedUserId);
          return next;
        });
      } else {
        setUsers(new Map());
        setCacheTimestamps(new Map());
      }
    },
    []
  );

  // アバター画像URLを取得
  // 通常時は固定URLを使用（ブラウザキャッシュを有効活用）
  // タイムスタンプがある場合のみキャッシュバスターとして使用（アバター更新時）
  const getAvatarUrl = useCallback(
    (userId: string): string | null => {
      const user = users.get(userId);
      if (!user || !user.avatar) {
        return null;
      }
      const timestamp = cacheTimestamps.get(userId);
      return timestamp
        ? `/api/users/${encodeURIComponent(userId)}/avatar?v=${timestamp}`
        : `/api/users/${encodeURIComponent(userId)}/avatar`;
    },
    [cacheTimestamps, users]
  );

  return (
    <UsersContext.Provider
      value={{
        users,
        loading,
        error,
        getUser,
        getUsers,
        setUser,
        invalidateCache,
        getAvatarUrl,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
}

