// ログインアクティビティ記録API Route

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSID } from '@/features/auth/api/auth';
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
    // Windows環境からSIDを取得
    const sid = await getCurrentUserSID();

    if (!sid) {
      return NextResponse.json(
        { success: false, error: 'Could not get user SID' },
        { status: 401 }
      );
    }

    // ログインアクティビティを記録（1日1回のみのチェックは内部で行われる）
    recordLoginActivityEvent(sid);

    // last_loginを更新（日付が変わった場合に更新される）
    try {
      const user = await getUserData(sid);
      if (user) {
        const now = new Date();
        await updateUserData(sid, {
          last_login: now.toISOString(),
        });
        debug(MODULE_NAME, `last_login updated for sid=${sid}`);
      }
    } catch (err) {
      // last_loginの更新に失敗しても、ログインイベントの記録は成功しているので続行
      error(MODULE_NAME, `Failed to update last_login for sid=${sid}:`, err);
    }

    debug(MODULE_NAME, `Login activity recorded for sid=${sid}`);

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

