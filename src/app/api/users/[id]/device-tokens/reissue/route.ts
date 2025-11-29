// デバイストークン再発行API

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDatabase } from '@/shared/lib/database/db';
import { getUserData } from '@/shared/lib/data-access/users';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { signToken } from '@/shared/lib/auth/device-token';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[id]/device-tokens/reissue';

/**
 * POST /api/users/[id]/device-tokens/reissue
 * 指定ユーザーのデバイストークンを再発行（管理者のみ）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id } = await params;
    const decodedUserId = decodeURIComponent(id);

    // ユーザーが存在するか確認
    const user = await getUserData(decodedUserId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { device_label, revoke_existing = true } = body;

    const db = getDatabase();
    const now = new Date().toISOString();

    // トランザクション開始
    const transaction = db.transaction(() => {
      // 既存のアクティブトークンを失効させる
      if (revoke_existing) {
        db.prepare(
          `UPDATE device_tokens 
           SET status = 'revoked' 
           WHERE user_id = ? AND status = 'active'`
        ).run(decodedUserId);
        debug(MODULE_NAME, `既存のアクティブトークンを失効させました: user_id=${decodedUserId}`);
      }

      // 新しいトークンを生成
      const tokenValue = randomUUID();
      const deviceLabel = device_label || `device-${randomUUID().slice(0, 6)}`;
      const signature = signToken({
        token: tokenValue,
        userId: decodedUserId,
        issuedAt: now,
        deviceLabel,
      });

      // データベースに保存
      db.prepare(
        `
        INSERT INTO device_tokens (
          token,
          user_id,
          signature,
          device_label,
          issued_at,
          last_used,
          status,
          signature_version
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1)
        `
      ).run(tokenValue, decodedUserId, signature, deviceLabel, now, now);

      // device-token.jsonの内容を生成
      const deviceTokenFile = {
        schema_version: '1.0.0',
        token: tokenValue,
        signature,
        user_id: decodedUserId,
        issued_at: now,
        device_label: deviceLabel,
        signature_version: 1,
      };

      return deviceTokenFile;
    });

    const deviceTokenFile = transaction();

    debug(
      MODULE_NAME,
      `デバイストークンを再発行しました: user_id=${decodedUserId}, token=${deviceTokenFile.token}`
    );

    return NextResponse.json({
      success: true,
      token: deviceTokenFile.token,
      device_token_file: deviceTokenFile,
      message: 'デバイストークンを再発行しました',
    });
  } catch (err) {
    error(MODULE_NAME, 'デバイストークン再発行エラー:', err);
    return NextResponse.json(
      { success: false, error: 'デバイストークンの再発行に失敗しました' },
      { status: 500 }
    );
  }
}

