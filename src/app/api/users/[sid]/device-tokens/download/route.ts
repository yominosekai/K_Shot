// デバイストークン証明ファイルダウンロードAPI

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getUserData } from '@/shared/lib/data-access/users';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { signToken } from '@/shared/lib/auth/device-token';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[sid]/device-tokens/download';

/**
 * GET /api/users/[sid]/device-tokens/download?token=...
 * 指定されたデバイストークンの証明ファイルをダウンロード（管理者のみ）
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
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'トークンが指定されていません' },
        { status: 400 }
      );
    }

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
      `SELECT 
        token,
        user_sid,
        signature,
        device_label,
        issued_at,
        signature_version
       FROM device_tokens
       WHERE token = ? AND user_sid = ?`
    ).get(token, decodedSid) as {
      token: string;
      user_sid: string;
      signature: string;
      device_label: string | null;
      issued_at: string;
      signature_version: number;
    } | undefined;

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'デバイストークンが見つかりません' },
        { status: 404 }
      );
    }

    // device-token.jsonの内容を生成
    const deviceTokenFile = {
      schema_version: '1.0.0',
      token: tokenRecord.token,
      signature: tokenRecord.signature,
      user_sid: tokenRecord.user_sid,
      issued_at: tokenRecord.issued_at,
      device_label: tokenRecord.device_label || undefined,
      signature_version: tokenRecord.signature_version || 1,
    };

    const jsonContent = JSON.stringify(deviceTokenFile, null, 2);

    debug(MODULE_NAME, `証明ファイルをダウンロード: token=${token}, user_sid=${decodedSid}`);

    // JSONファイルとしてダウンロード
    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="device-token.json"`,
      },
    });
  } catch (err) {
    error(MODULE_NAME, '証明ファイルダウンロードエラー:', err);
    return NextResponse.json(
      { success: false, error: '証明ファイルのダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}



