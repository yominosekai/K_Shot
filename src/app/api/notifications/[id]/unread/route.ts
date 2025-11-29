// 通知未読戻しAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsUnread } from '@/shared/lib/data-access/notifications';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/notifications/[id]/unread';

/**
 * PUT /api/notifications/[id]/unread
 * 通知を未読に戻す
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

    const success = await markNotificationAsUnread(id, user_id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '通知の未読戻しに失敗しました' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '通知を未読に戻しました',
    });
  } catch (err) {
    error(MODULE_NAME, '通知未読戻しエラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の未読戻しに失敗しました' },
      { status: 500 }
    );
  }
}

