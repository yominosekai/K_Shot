// デバイストークン一覧取得API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getUserData } from '@/shared/lib/data-access/users';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[sid]/device-tokens';

interface DeviceTokenRecord {
  token: string;
  device_label: string | null;
  issued_at: string;
  last_used: string | null;
  status: string;
}

/**
 * GET /api/users/[sid]/device-tokens
 * 指定ユーザーのデバイストークン一覧を取得（管理者のみ）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    // 管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { sid } = await params;
    const decodedSid = decodeURIComponent(sid);

    // ユーザーが存在するか確認
    const user = await getUserData(decodedSid);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const db = getDatabase();
    const tokens = db.prepare(
      `SELECT 
        token,
        device_label,
        issued_at,
        last_used,
        status
       FROM device_tokens
       WHERE user_sid = ?
       ORDER BY issued_at DESC`
    ).all(decodedSid) as DeviceTokenRecord[];

    debug(MODULE_NAME, `デバイストークン一覧取得: user_sid=${decodedSid}, count=${tokens.length}`);

    return NextResponse.json({
      success: true,
      tokens: tokens.map((token) => ({
        token: token.token,
        device_label: token.device_label,
        issued_at: token.issued_at,
        last_used: token.last_used,
        status: token.status,
      })),
    });
  } catch (err) {
    error(MODULE_NAME, 'デバイストークン一覧取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'デバイストークン一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}



