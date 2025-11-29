// ユーザー通知API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getUserNotifications, getUnreadNotificationCount } from '@/shared/lib/data-access/notifications';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[id]/notifications';

/**
 * GET /api/users/[id]/notifications
 * ユーザーの通知一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // URLデコード
    let decodedId: string;
    try {
      decodedId = decodeURIComponent(id);
    } catch {
      decodedId = id;
    }

    const notifications = await getUserNotifications(decodedId, unreadOnly, limit);
    const unreadCount = getUnreadNotificationCount(decodedId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    error(MODULE_NAME, '通知取得エラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の取得に失敗しました' },
      { status: 500 }
    );
  }
}

