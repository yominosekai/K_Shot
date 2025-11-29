'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User, SessionUser } from '@/features/auth/types';
import { SessionManager } from '@/features/auth/utils/session';
import { checkPermission } from '@/features/auth/utils';
import { useUsers } from '@/contexts/UsersContext';
import { getJSTTodayString, convertUTCToJSTDateString } from '@/shared/lib/utils/timezone';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  checkPermission: (permission: string) => boolean;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// last_loginが1時間以内かどうかを判定するヘルパー関数
const isLastLoginWithinOneHour = (lastLogin: string | undefined): boolean => {
  if (!lastLogin) return false;
  try {
    const lastLoginDate = new Date(lastLogin);
    const now = new Date();
    const timeDiff = now.getTime() - lastLoginDate.getTime();
    const oneHour = 60 * 60 * 1000;
    return timeDiff < oneHour;
  } catch {
    return false;
  }
};

// last_loginの日付が今日（JST基準）かどうかを判定するヘルパー関数
const isLastLoginToday = (lastLogin: string | undefined): boolean => {
  if (!lastLogin) return false;
  try {
    const today = getJSTTodayString();
    const lastLoginDate = convertUTCToJSTDateString(lastLogin);
    return lastLoginDate === today;
  } catch {
    return false;
  }
};

const getUserId = (user?: { id?: string } | null): string | null => {
  if (!user) {
    return null;
  }
  return user.id ?? null;
};

// セッションからユーザーを復元するヘルパー関数
const restoreUserFromCache = async (
  existingSession: SessionUser,
  getUserFromCache: (id: string) => Promise<User | null>,
  setUserInCache: (id: string, user: User) => void
): Promise<User | null> => {
  const sessionUserId = getUserId(existingSession);
  if (!sessionUserId) {
    return null;
  }

  const cachedUser = await getUserFromCache(sessionUserId);

  if (cachedUser) {
    const sessionManager = SessionManager.getInstance();
    sessionManager.setSession(cachedUser);
    return cachedUser;
  }

  // キャッシュがない場合、プロフィール情報だけ軽量APIで取得
  try {
    const profileResponse = await fetch(`/api/users/${sessionUserId}/profile`);
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData.success && profileData.profile) {
        const mergedUser: User = {
          id: sessionUserId,
          username: existingSession.username,
          display_name: existingSession.display_name,
          email: existingSession.email,
          role: existingSession.role,
          is_active: existingSession.is_active,
          department_id: profileData.profile.department_id,
          department: profileData.profile.department,
          created_date: new Date().toISOString(),
          last_login: existingSession.last_login,
          avatar: profileData.profile.avatar,
          bio: profileData.profile.bio,
          skills: profileData.profile.skills || [],
          certifications: profileData.profile.certifications || [],
          mos: profileData.profile.mos || [],
        };

        const sessionManager = SessionManager.getInstance();
        sessionManager.setSession(mergedUser);
        setUserInCache(sessionUserId, mergedUser);
        return mergedUser;
      }
    }
  } catch {
    // プロフィール情報取得エラーは無視
  }

  return null;
};

// セッションデータから基本情報のみ復元するヘルパー関数
const restoreUserFromSession = (existingSession: SessionUser): User => {
  const sessionUserId = getUserId(existingSession) ?? crypto.randomUUID();
  return {
    id: sessionUserId,
    username: existingSession.username,
    display_name: existingSession.display_name,
    email: existingSession.email,
    role: existingSession.role,
    is_active: existingSession.is_active,
    department_id: undefined,
    created_date: new Date().toISOString(),
    last_login: existingSession.last_login || new Date().toISOString(),
    avatar: undefined,
    bio: undefined,
    skills: [],
    certifications: [],
    mos: [],
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasAttemptedAuthRef = useRef(false);
  const { setUser: setUserInCache, getUser: getUserFromCache } = useUsers();

  // セッション復元と自動認証
  useEffect(() => {
    if (user || hasAttemptedAuthRef.current) {
      return;
    }

    hasAttemptedAuthRef.current = true;
    const sessionManager = SessionManager.getInstance();
    const existingSession = sessionManager.getSession();

    if (existingSession && sessionManager.isSessionValid()) {
      // 日付が変わった場合は、ログインイベントを記録
      if (!isLastLoginToday(existingSession.last_login)) {
        fetch('/api/activity/login', { method: 'POST' }).catch(() => {});
      }

      // last_loginが1時間以内かつ今日の場合は、キャッシュから復元
      if (
        isLastLoginWithinOneHour(existingSession.last_login) &&
        isLastLoginToday(existingSession.last_login)
      ) {
        restoreUserFromCache(existingSession, getUserFromCache, setUserInCache).then(
          (restoredUser) => {
            if (restoredUser) {
              React.startTransition(() => {
                setUser(restoredUser);
                setIsLoading(false);
              });
            }
          }
        );
        return;
      }

      // 日付が変わった場合でも、プロフィールデータは変わらないのでセッションデータから復元
      restoreUserFromCache(existingSession, getUserFromCache, setUserInCache).then(
        (restoredUser) => {
          if (restoredUser) {
            React.startTransition(() => {
              setUser(restoredUser);
              setIsLoading(false);
            });
          } else {
            const fallbackUser = restoreUserFromSession(existingSession);
            React.startTransition(() => {
              setUser(fallbackUser);
              setIsLoading(false);
            });
          }
        }
      );
      return;
    }

    // セッションがない場合は自動認証を実行
    const autoAuthenticate = async () => {
      const existingSession = sessionManager.getSession();

      if (existingSession && !isLastLoginToday(existingSession.last_login)) {
        fetch('/api/activity/login', { method: 'POST' }).catch(() => {});
      }

      if (
        existingSession &&
        isLastLoginWithinOneHour(existingSession.last_login) &&
        isLastLoginToday(existingSession.last_login)
      ) {
        const restoredUser = await restoreUserFromCache(existingSession, getUserFromCache, setUserInCache);

        if (restoredUser) {
          React.startTransition(() => {
            setUser(restoredUser);
            setIsLoading(false);
          });
          return;
        }
      }

      const maxRetries = 5;
      const retryDelay = 2000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/auth', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
          });

          const data = await response.json();
        if (data.success && data.user) {
          sessionManager.setSession(data.user);
            React.startTransition(() => {
              setUser(data.user);
              setIsLoading(false);
            });
            return;
          } else if (data.error === 'DEVICE_TOKEN_REQUIRED') {
            // デバイストークンが必要な場合は、即座にセットアップ画面にリダイレクト（履歴を置き換える）
            router.replace('/setup');
            return;
          }
        } catch {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      setIsLoading(false);
    };

    autoAuthenticate();
  }, []);

  const logout = (): void => {
    const sessionManager = SessionManager.getInstance();
    sessionManager.clearSession();
    React.startTransition(() => {
      setUser(null);
    });
  };

  const checkUserPermission = (permission: string): boolean => {
    return checkPermission(user, permission);
  };

  const updateUser = (updatedUser: User) => {
    const sessionManager = SessionManager.getInstance();
    sessionManager.setSession(updatedUser);
    setUserInCache(getUserId(updatedUser) ?? '', updatedUser);
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
    checkPermission: checkUserPermission,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
