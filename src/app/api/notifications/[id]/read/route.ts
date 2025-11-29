// 通知既読API Routes

import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/shared/lib/data-access/notifications';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/notifications/[id]/read';

/**
 * PUT /api/notifications/[id]/read
 * 通知を既読にする
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 400 }
      );
    }

    const success = await markNotificationAsRead(id, user_id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '通知の既読処理に失敗しました' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '通知を既読にしました',
    });
  } catch (err) {
    error(MODULE_NAME, '通知既読エラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の既読処理に失敗しました' },
      { status: 500 }
    );
  }
}


