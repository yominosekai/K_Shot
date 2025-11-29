// 初期ユーザー & デバイストークン自動発行API

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDatabase } from '@/shared/lib/database/db';
import { writeDeviceToken, signToken } from '@/shared/lib/auth/device-token';

const MODULE_NAME = 'api/setup/bootstrap-user';

export async function POST() {
  try {
    const db = getDatabase();
    
    // 初回セットアップ時のみ呼び出される（DBにユーザーが0人の場合のみ）
    // セキュリティのため、ここでもチェックを行う
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count > 0) {
      // DBにユーザーが存在する場合、初回セットアップではないため、エラーを返す
      return NextResponse.json(
        { success: false, error: '既にユーザーが存在するため、新規ユーザーを作成できません。管理者に問い合わせてください。' },
        { status: 403 }
      );
    }
    
    // 新しいユーザーとトークンを発行する
    const userId = randomUUID();
    const username = `user_${userId.slice(0, 8)}`;
    const displayName = `User ${userId.slice(0, 6)}`;
    const email = `${username}@local`;
    const now = new Date().toISOString();
    const deviceLabel = `device-${randomUUID().slice(0, 6)}`;

    db.prepare(
      `
        INSERT INTO users (
          id,
          username,
          display_name,
          email,
          role,
          is_active,
          created_date,
          last_login
        )
        VALUES (?, ?, ?, ?, 'user', 1, ?, ?)
      `
    ).run(userId, username, displayName, email, now, now);

    const tokenValue = randomUUID();
    const issuedAt = now;
    const signature = signToken({
      token: tokenValue,
      userId,
      issuedAt,
      deviceLabel,
    });

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
    ).run(tokenValue, userId, signature, deviceLabel, issuedAt, issuedAt);

    await writeDeviceToken({
      schema_version: '1.0.0',
      token: tokenValue,
      signature,
      user_id: userId,
      issued_at: issuedAt,
      device_label: deviceLabel,
      signature_version: 1,
    });

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: '初期ユーザーとデバイストークンを発行しました',
    });
  } catch (error) {
    console.error(`[${MODULE_NAME}] POSTエラー:`, error);
    return NextResponse.json(
      { success: false, error: '初期ユーザーの作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

