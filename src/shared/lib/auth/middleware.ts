// 認証・認可チェック用の共通ミドルウェア関数

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/features/auth/api/auth';
import { checkPermission } from '@/features/auth/utils';
import type { User } from '@/features/auth/types';
import { getAuthCache, setAuthCache, clearAuthCache } from './session-cache';
import { debug, error } from '../logger';
import { getUserData } from '@/shared/lib/data-access/users';

const MODULE_NAME = 'auth-middleware';

/**
 * 認証結果（成功時）
 */
export interface AuthResult {
  success: true;
  user: User;
}

/**
 * 認証結果（失敗時）
 */
export interface AuthError {
  success: false;
  response: NextResponse;
}

/**
 * 認証必須チェック
 * @returns 認証成功時はユーザー情報、失敗時はNextResponse
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  try {
    // Windows環境からSIDを取得
    const { getCurrentUserSID } = await import('@/features/auth/api/auth');
    const sid = await getCurrentUserSID();

    if (!sid) {
      error(MODULE_NAME, 'requireAuth: SIDを取得できませんでした');
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: '認証が必要です' },
          { status: 401 }
        ),
      };
    }

    // キャッシュから取得を試みる
    const cachedUser = getAuthCache(sid);
    if (cachedUser) {
      debug(MODULE_NAME, `requireAuth: キャッシュから取得: sid=${sid}`);
      return {
        success: true,
        user: cachedUser,
      };
    }

    // キャッシュにない場合は認証処理を実行
    debug(MODULE_NAME, `requireAuth: 認証処理を実行: sid=${sid}`);
    let authResult;
    try {
      authResult = await authenticateUser();
    } catch (err) {
      // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
      if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: '認証が必要です' },
            { status: 401 }
          ),
        };
      }
      throw err;
    }

    if (!authResult.success || !authResult.user) {
      // ドライブ設定未完了が原因で認証失敗の可能性があるため、
      // エラーログは出力しない（getDataDir()で既に出力済み）
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: '認証が必要です' },
          { status: 401 }
        ),
      };
    }

    // 認証成功時はキャッシュに保存
    setAuthCache(sid, authResult.user);

    return {
      success: true,
      user: authResult.user,
    };
  } catch (err) {
    error(MODULE_NAME, 'requireAuthエラー:', err);
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: '認証処理中にエラーが発生しました' },
        { status: 500 }
      ),
    };
  }
}

/**
 * 権限チェック
 * @param user ユーザー情報
 * @param permission 必要な権限（'admin' | 'instructor' | 'user'）
 * @returns 権限がある場合はtrue、ない場合はfalse
 */
export function hasPermission(
  user: User | null,
  permission: 'admin' | 'instructor' | 'user'
): boolean {
  if (!user) {
    return false;
  }
  return checkPermission(user, permission);
}

/**
 * 管理者権限チェック
 * @param user ユーザー情報
 * @returns 管理者の場合はtrue、それ以外はfalse
 */
export function isAdmin(user: User | null): boolean {
  return hasPermission(user, 'admin');
}

/**
 * 教育者権限チェック（管理者も含む）
 * @param user ユーザー情報
 * @returns 教育者または管理者の場合はtrue、それ以外はfalse
 */
export function isInstructor(user: User | null): boolean {
  return hasPermission(user, 'instructor');
}

/**
 * 認証必須 + 権限チェック
 * @param permission 必要な権限（'admin' | 'instructor' | 'user'）
 * @returns 認証成功かつ権限がある場合はユーザー情報、それ以外はNextResponse
 */
export async function requireRole(
  permission: 'admin' | 'instructor' | 'user'
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  const initialUser = authResult.user;

  if (hasPermission(initialUser, permission)) {
    return authResult;
  }

  const refreshedUser = await refreshAuthUser(initialUser.sid ?? initialUser.id);

  if (refreshedUser && hasPermission(refreshedUser, permission)) {
    return {
      success: true,
      user: refreshedUser,
    };
  }

  const actualRole = refreshedUser?.role ?? initialUser.role;
  error(
    MODULE_NAME,
    `requireRole: 権限不足: sid=${initialUser.sid}, required=${permission}, actual=${actualRole}`
  );
  return {
    success: false,
    response: NextResponse.json(
      { success: false, error: '権限が不足しています' },
      { status: 403 }
    ),
  };
}

/**
 * 認証必須 + 管理者権限チェック
 * @returns 認証成功かつ管理者の場合はユーザー情報、それ以外はNextResponse
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  return requireRole('admin');
}

/**
 * 認証必須 + 教育者権限チェック（管理者も含む）
 * @returns 認証成功かつ教育者または管理者の場合はユーザー情報、それ以外はNextResponse
 */
export async function requireInstructor(): Promise<AuthResult | AuthError> {
  return requireRole('instructor');
}

/**
 * 本人または管理者のみアクセス可能
 * @param targetSid 対象ユーザーのSID
 * @returns 認証成功かつ本人または管理者の場合はユーザー情報、それ以外はNextResponse
 */
export async function requireOwnerOrAdmin(
  targetSid: string
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  const user = authResult.user;

  // 本人または管理者の場合は許可
  if (user.sid === targetSid || isAdmin(user)) {
    return authResult;
  }

  error(MODULE_NAME, `requireOwnerOrAdmin: アクセス拒否: sid=${user.sid}, targetSid=${targetSid}`);
  return {
    success: false,
    response: NextResponse.json(
      { success: false, error: '権限が不足しています' },
      { status: 403 }
    ),
  };
}

async function refreshAuthUser(sid?: string): Promise<User | null> {
  if (!sid) {
    return null;
  }

  try {
    const user = await getUserData(sid);
    if (user) {
      setAuthCache(sid, user);
      return user;
    }
    clearAuthCache(sid);
    return null;
  } catch (err) {
    error(MODULE_NAME, `refreshAuthUserエラー: sid=${sid}`, err);
    return null;
  }
}


