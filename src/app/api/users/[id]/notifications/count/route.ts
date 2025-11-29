// ユーザー未読通知数API Routes（軽量版）

import { NextRequest, NextResponse } from 'next/server';
import { getUnreadNotificationCount } from '@/shared/lib/data-access/notifications';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[id]/notifications/count';

/**
 * GET /api/users/[id]/notifications/count
 * ユーザーの未読通知数のみを取得（軽量API）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // URLデコード
    let decodedId: string;
    try {
      decodedId = decodeURIComponent(id);
    } catch {
      decodedId = id;
    }

    const unreadCount = getUnreadNotificationCount(decodedId);

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (err) {
    // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
    if (!(err instanceof Error && err.message.includes('ドライブ設定が完了していません'))) {
      error(MODULE_NAME, '未読通知数取得エラー:', err);
    }
    return NextResponse.json(
      { success: false, error: '未読通知数の取得に失敗しました' },
      { status: 500 }
    );
  }
}

