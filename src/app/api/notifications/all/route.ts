// 全通知削除API Routes

import { NextRequest, NextResponse } from 'next/server';
import { deleteAllNotifications } from '@/shared/lib/data-access/notifications';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/notifications/all';

/**
 * DELETE /api/notifications/all
 * すべての通知を削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 400 }
      );
    }

    const deletedCount = await deleteAllNotifications(user_id);

    return NextResponse.json({
      success: true,
      message: `${deletedCount}件の通知を削除しました`,
      deletedCount,
    });
  } catch (err) {
    error(MODULE_NAME, '全通知削除エラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の削除に失敗しました' },
      { status: 500 }
    );
  }
}

