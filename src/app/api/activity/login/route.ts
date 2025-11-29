// ログインアクティビティ記録API Route

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/features/auth/api/auth';
import { recordLoginActivityEvent } from '@/shared/lib/activity-log';
import { getUserData, updateUserData } from '@/shared/lib/data-access/users';
import { debug, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/activity/login';

/**
 * POST /api/activity/login
 * ログインアクティビティを記録し、last_loginを更新する（軽量版）
 * 日付が変わった場合に、セッションが有効でもログインイベントを記録するために使用
 */
export async function POST(request: NextRequest) {
  try {
    // デバイストークンからユーザーIDを取得
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Could not get user ID' },
        { status: 401 }
      );
    }

    // ログインアクティビティを記録（1日1回のみのチェックは内部で行われる）
    recordLoginActivityEvent(userId);

    // last_loginを更新（日付が変わった場合に更新される）
    try {
      const user = await getUserData(userId);
      if (user) {
        const now = new Date();
        await updateUserData(userId, {
          last_login: now.toISOString(),
        });
        debug(MODULE_NAME, `last_login updated for userId=${userId}`);
      }
    } catch (err) {
      // last_loginの更新に失敗しても、ログインイベントの記録は成功しているので続行
      error(MODULE_NAME, `Failed to update last_login for userId=${userId}:`, err);
    }

    debug(MODULE_NAME, `Login activity recorded for userId=${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Login activity recorded',
    });
  } catch (err) {
    error(MODULE_NAME, 'Failed to record login activity:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to record login activity' },
      { status: 500 }
    );
  }
}

