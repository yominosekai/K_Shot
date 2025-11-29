// 認証APIロジック（サーバー側のみ）

import { getUserData, updateUserData } from '@/shared/lib/data-access/users';
import { recordUserActivity } from '@/shared/lib/database/activity';
import { recordLoginActivityEvent } from '@/shared/lib/activity-log';
import type { AuthResponse, User } from '../types';
import { debug, error } from '@/shared/lib/logger';
import { readDeviceToken, verifyTokenSignature } from '@/shared/lib/auth/device-token';
import { getDatabase } from '@/shared/lib/database/db';
const MODULE_NAME = 'auth';

/**
 * ローカル証明ファイルから現在のユーザー識別子を取得（UUID）
 * @returns ユーザーID文字列、取得できない場合はnull
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const token = readDeviceToken();
    if (!token) {
      // エラーログは出力しない（認証フローで処理される）
      return null;
    }

    if (!verifyTokenSignature(token)) {
      error(MODULE_NAME, 'getCurrentUserId: デバイストークンの署名検証に失敗しました');
      return null;
    }

    // データベースでトークンのステータスを確認
    const db = getDatabase();
    const tokenRecord = db.prepare(
      'SELECT status FROM device_tokens WHERE token = ?'
    ).get(token.token) as { status: string } | undefined;

    if (!tokenRecord) {
      // エラーログは出力しない（認証フローで処理される）
      return null;
    }

    if (tokenRecord.status === 'revoked') {
      error(MODULE_NAME, 'getCurrentUserId: デバイストークンは失効しています');
      return null;
    }

    return token.user_id;
  } catch (err) {
    console.error('[getCurrentUserId] デバイストークン取得エラー:', err);
    return null;
  }
}

/**
 * 認証処理（GET）
 */
export async function authenticateUser(): Promise<AuthResponse> {
  try {
    debug(MODULE_NAME, 'authenticateUser開始: リロード時の認証処理');
    // デバイストークンからユーザー識別子を取得
    const userId = await getCurrentUserId();

    if (!userId) {
      // デバイストークンがない場合は、セットアップ画面へのリダイレクトを促す
      return {
        success: false,
        error: 'DEVICE_TOKEN_REQUIRED',
        message: 'デバイストークンが必要です。初期設定画面でトークンを発行してください。',
      };
    }

    debug(MODULE_NAME, `authenticateUser: ユーザーID取得完了: ${userId}`);

    // トークンの最終使用日時を更新
    try {
      const token = readDeviceToken();
      if (token) {
        const db = getDatabase();
        const now = new Date().toISOString();
        db.prepare(
          'UPDATE device_tokens SET last_used = ? WHERE token = ?'
        ).run(now, token.token);
      }
    } catch (err) {
      // 最終使用日時の更新に失敗しても認証は続行
      debug(MODULE_NAME, '最終使用日時の更新に失敗しました（認証は続行）:', err);
    }

    // ユーザーデータを取得
    let user: User | null;
    try {
      user = await getUserData(userId);
    } catch (err) {
      // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
      if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
        return {
          success: false,
          error: 'User not found',
        };
      }
      throw err;
    }

    if (!user) {
      // ドライブ設定未完了が原因でユーザーが見つからない可能性があるため、
      // エラーログは出力しない（getDataDir()で既に出力済み）
      return {
        success: false,
        error: 'User not found',
      };
    }

    debug(MODULE_NAME, `authenticateUser: ユーザーデータ取得完了`, {
      userId,
      hasAvatar: !!user.avatar,
      avatarPath: user.avatar,
      displayName: user.display_name,
    });

    // 最終ログイン時刻を更新（1時間以内の場合はスキップ）
    const now = new Date();
    const lastLogin = new Date(user.last_login);
    const timeDiff = now.getTime() - lastLogin.getTime();
    const oneHour = 60 * 60 * 1000;

    // 今日のアクティビティを記録（1日1回のみ、非同期実行でレスポンス時間への影響を最小化）
    // エラーが発生しても次回に記録されるため、非同期実行でも問題なし
    Promise.resolve().then(() => {
      recordUserActivity(userId);
      recordLoginActivityEvent(userId);
    }).catch((err) => {
      // 非同期処理のエラーはログに記録するのみ（レスポンスには影響しない）
      error(MODULE_NAME, 'アクティビティ記録エラー（非同期）:', err);
    });

    if (timeDiff > oneHour) {
      debug(
        MODULE_NAME,
        `authenticateUser: last_loginを更新します (${Math.round(timeDiff / 1000 / 60)}分経過)`
      );
      const updatedUser = await updateUserData(userId, {
        last_login: now.toISOString(),
      });
      // 更新後のデータを返す（avatarを含む）
      if (updatedUser) {
        debug(MODULE_NAME, 'authenticateUser完了: 認証成功（last_login更新後）', {
          userId,
          hasAvatar: !!updatedUser.avatar,
          avatarPath: updatedUser.avatar,
        });
        return {
          success: true,
          user: updatedUser,
          message: 'Authentication successful',
        };
      }
    } else {
      debug(MODULE_NAME, `authenticateUser: last_loginは更新不要 (${Math.round(timeDiff / 1000 / 60)}分経過)`);
    }

    debug(MODULE_NAME, 'authenticateUser完了: 認証成功', {
      userId,
      hasAvatar: !!user.avatar,
      avatarPath: user.avatar,
    });

    return {
      success: true,
      user,
      message: 'Authentication successful',
    };
  } catch (err) {
    error(MODULE_NAME, 'authenticateUserエラー:', err);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

// 互換用エクスポート（旧名称・非推奨）
// @deprecated この関数は後方互換性のために残されていますが、`authenticateUser()`を使用してください。
export async function authenticateUserWithSID(): Promise<AuthResponse> {
  return authenticateUser();
}

