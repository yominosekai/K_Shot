// 全通知既読API Routes

import { NextRequest, NextResponse } from 'next/server';
import { markAllNotificationsAsRead } from '@/shared/lib/data-access/notifications';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/notifications/all/read';

/**
 * PUT /api/notifications/all/read
 * すべての通知を既読にする
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 400 }
      );
    }

    await markAllNotificationsAsRead(user_id);

    return NextResponse.json({
      success: true,
      message: 'すべての通知を既読にしました',
    });
  } catch (err) {
    error(MODULE_NAME, '全通知既読エラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の既読処理に失敗しました' },
      { status: 500 }
    );
  }
}

