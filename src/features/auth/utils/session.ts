// セッション管理ユーティリティ

import type { User, SessionUser } from '../types';

const SESSION_KEY = 'k_shot_session';

/**
 * セッション管理クラス（Cookieベース）
 * Cookieには軽量なデータのみ保存（avatar等の大きなデータは除外）
 */
export class SessionManager {
  private static instance: SessionManager;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * UserからSessionUserに変換（軽量化）
   */
  private toSessionUser(user: User): SessionUser {
    const canonicalId = user.id ?? user.sid;
    return {
      id: canonicalId || 'unknown',
      sid: user.sid || canonicalId,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
    };
  }

  /**
   * セッションを設定（軽量なデータのみCookieに保存）
   */
  setSession(user: User): void {
    if (typeof window === 'undefined') return;

    // 軽量なセッションデータのみ保存（avatar等は除外）
    const sessionUser = this.toSessionUser(user);
    const cookieValue = encodeURIComponent(JSON.stringify(sessionUser));
    document.cookie = `${SESSION_KEY}=${cookieValue}; path=/; max-age=86400; SameSite=Lax`;
  }

  /**
   * セッションを取得（軽量なデータのみ）
   */
  getSession(): SessionUser | null {
    if (typeof window === 'undefined') return null;

    try {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find((cookie) =>
        cookie.trim().startsWith(`${SESSION_KEY}=`)
      );

      if (!sessionCookie) {
        return null;
      }

      const cookieValue = sessionCookie.split('=')[1];
      const sessionUser = JSON.parse(decodeURIComponent(cookieValue)) as SessionUser;
      return sessionUser;
    } catch (error) {
      console.error('[SessionManager] Error parsing session cookie:', error);
      return null;
    }
  }

  /**
   * セッションをクリア
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;

    document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * セッションが有効かどうか
   */
  isSessionValid(): boolean {
    const sessionUser = this.getSession();
    if (!sessionUser) return false;

    // is_activeが文字列の場合は適切に変換
    let isActive = sessionUser.is_active;
    if (typeof isActive === 'string') {
      isActive = isActive === 'true' || isActive === 'True';
    }

    return isActive === true;
  }
}

