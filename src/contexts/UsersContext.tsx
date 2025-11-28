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
  getUser: (sid: string) => Promise<User | null>;
  getUsers: (sids: string[]) => Promise<Map<string, User>>;
  setUser: (sid: string, user: User) => void;
  invalidateCache: (sid?: string, updateAvatarTimestamp?: boolean) => void;
  getAvatarUrl: (sid: string) => string | null;
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

const isLegacyWindowsSid = (value: string): boolean => /^S-1-/.test(value);

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

    Object.entries(parsed.users).forEach(([sid, user]) => {
      const timestamp = parsed.timestamps[sid];
      if (!timestamp || current - timestamp < CACHE_DURATION) {
        users.set(sid, user);
        if (timestamp) {
          timestamps.set(sid, timestamp);
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
  users.forEach((user, sid) => {
    payload.users[sid] = user;
  });
  timestamps.forEach((timestamp, sid) => {
    payload.timestamps[sid] = timestamp;
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

  const setUserWithTimestamp = useCallback((sid: string, user: User, timestamp = now()) => {
    setUsers((prev) => {
      const next = new Map(prev);
      next.set(sid, user);
      return next;
    });
    setCacheTimestamps((prev) => {
      const next = new Map(prev);
      next.set(sid, timestamp);
      return next;
    });
  }, []);

  const getUser = useCallback(
    async (sid: string): Promise<User | null> => {
      if (!sid) {
        return null;
      }

      const normalizedSid = sid.trim();
      if (isLegacyWindowsSid(normalizedSid)) {
        console.warn('[UsersContext] Ignoring legacy SID lookup:', normalizedSid);
        return null;
      }

      const cached = users.get(normalizedSid);
      const timestamp = cacheTimestamps.get(normalizedSid);
      if (cached && isFresh(timestamp)) {
        return cached;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/users/${encodeURIComponent(normalizedSid)}`);
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
        setUserWithTimestamp(normalizedSid, fetchedUser);
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
    async (sids: string[]): Promise<Map<string, User>> => {
      const result = new Map<string, User>();
      const uncachedSids: string[] = [];

      // キャッシュから取得できるものを先に取得（refから最新の状態を取得）
      const now = Date.now();
      sids.forEach((sid) => {
        if (!sid) {
          return;
        }
        const normalizedSid = sid.trim();
        if (isLegacyWindowsSid(normalizedSid)) {
          console.warn('[UsersContext] Skipping legacy SID in batch lookup:', normalizedSid);
          return;
        }

        const cached = users.get(normalizedSid);
        const timestamp = cacheTimestamps.get(normalizedSid);

        if (cached && (!timestamp || now - timestamp < CACHE_DURATION)) {
          result.set(normalizedSid, cached);
        } else {
          uncachedSids.push(normalizedSid);
        }
      });

      // キャッシュにないものは並列で取得
      if (uncachedSids.length > 0) {
        const promises = uncachedSids.map((sid) => getUser(sid));
        const results = await Promise.all(promises);

        results.forEach((user, index) => {
          if (user) {
            result.set(uncachedSids[index], user);
          }
        });
      }

      return result;
    },
    [cacheTimestamps, getUser, users]
  );

  // ユーザー情報を直接設定（AuthContextから取得した情報を保存する場合など）
  const setUser = useCallback(
    (sid: string, user: User) => {
      if (!sid) return;
      const normalizedSid = sid.trim();
      if (isLegacyWindowsSid(normalizedSid)) return;

      setUsers((prev) => {
        const next = new Map(prev);
        next.set(normalizedSid, user);
        return next;
      });
    },
    []
  );

  // キャッシュを無効化
  // updateAvatarTimestamp: trueの場合、アバター更新時のみタイムスタンプを更新（URLを変更してブラウザキャッシュを無効化）
  const invalidateCache = useCallback(
    (sid?: string, updateAvatarTimestamp: boolean = false) => {
      if (sid) {
        const normalizedSid = sid.trim();
        if (isLegacyWindowsSid(normalizedSid)) {
          return;
        }

        if (updateAvatarTimestamp) {
          setCacheTimestamps((prev) => {
            const next = new Map(prev);
            next.set(normalizedSid, now());
            return next;
          });
          return;
        }

        setUsers((prev) => {
          const next = new Map(prev);
          next.delete(normalizedSid);
          return next;
        });
        setCacheTimestamps((prev) => {
          const next = new Map(prev);
          next.delete(normalizedSid);
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
    (sid: string): string | null => {
      const user = users.get(sid);
      if (!user || !user.avatar) {
        return null;
      }
      const timestamp = cacheTimestamps.get(sid);
      return timestamp
        ? `/api/users/${encodeURIComponent(sid)}/avatar?v=${timestamp}`
        : `/api/users/${encodeURIComponent(sid)}/avatar`;
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

