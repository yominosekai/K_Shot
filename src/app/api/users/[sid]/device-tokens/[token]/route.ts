// デバイストークン失効API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getUserData } from '@/shared/lib/data-access/users';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[sid]/device-tokens/[token]';

/**
 * DELETE /api/users/[sid]/device-tokens/[token]
 * 指定されたデバイストークンを失効させる（管理者のみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string; token: string }> }
) {
  try {
    // 管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { sid, token } = await params;
    const decodedSid = decodeURIComponent(sid);
    const decodedToken = decodeURIComponent(token);

    // ユーザーが存在するか確認
    const user = await getUserData(decodedSid);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const db = getDatabase();

    // トークンが存在し、該当ユーザーに紐づいているか確認
    const tokenRecord = db.prepare(
      'SELECT token, status FROM device_tokens WHERE token = ? AND user_sid = ?'
    ).get(decodedToken, decodedSid) as { token: string; status: string } | undefined;

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'デバイストークンが見つかりません' },
        { status: 404 }
      );
    }

    if (tokenRecord.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'このデバイストークンは既に失効しています' },
        { status: 400 }
      );
    }

    // トークンを失効させる
    db.prepare(
      'UPDATE device_tokens SET status = ? WHERE token = ?'
    ).run('revoked', decodedToken);

    debug(MODULE_NAME, `デバイストークンを失効させました: token=${decodedToken}, user_sid=${decodedSid}`);

    return NextResponse.json({
      success: true,
      message: 'デバイストークンを失効させました',
    });
  } catch (err) {
    error(MODULE_NAME, 'デバイストークン失効エラー:', err);
    return NextResponse.json(
      { success: false, error: 'デバイストークンの失効に失敗しました' },
      { status: 500 }
    );
  }
}



