// 通知削除API Routes

import { NextRequest, NextResponse } from 'next/server';
import { deleteNotification } from '@/shared/lib/data-access/notifications';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/notifications/[id]';

/**
 * DELETE /api/notifications/[id]
 * 通知を削除（個別）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 400 }
      );
    }

    const success = await deleteNotification(id, userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '通知の削除に失敗しました' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '通知を削除しました',
    });
  } catch (err) {
    error(MODULE_NAME, '通知削除エラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の削除に失敗しました' },
      { status: 500 }
    );
  }
}

