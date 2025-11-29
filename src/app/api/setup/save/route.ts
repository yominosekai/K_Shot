// ドライブ設定保存API Route

import { NextRequest, NextResponse } from 'next/server';
import { saveDriveConfig } from '@/shared/lib/utils/drive-config';
import { SUB_FOLDER } from '@/config/drive';
import {
  readDeviceToken,
  verifyTokenSignature,
  writeDeviceToken,
  signToken,
} from '@/shared/lib/auth/device-token';
import type { DeviceTokenFile } from '@/shared/lib/auth/device-token';
import { isDeviceSetupCompleted, markDeviceSetupCompleted } from '@/shared/lib/auth/device-setup';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';

/**
 * POST /api/setup/save
 * ドライブ設定を保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { networkPath, driveLetter, createFolder } = body;

    if (!networkPath || !driveLetter) {
      return NextResponse.json(
        { success: false, error: 'ネットワークパスとドライブレターが必要です' },
        { status: 400 }
      );
    }

    // ネットワークパスの形式チェック
    if (!networkPath.startsWith('\\\\')) {
      return NextResponse.json(
        { success: false, error: 'ネットワークパスはUNCパス形式（\\\\server\\share\\）である必要があります' },
        { status: 400 }
      );
    }

    // ドライブレターの形式チェック
    if (!/^[A-Z]$/.test(driveLetter)) {
      return NextResponse.json(
        { success: false, error: 'ドライブレターはA-Zの1文字である必要があります' },
        { status: 400 }
      );
    }

    // フルパスを構築
    const fullPath = `${driveLetter}:\\${SUB_FOLDER}`;

    // フォルダの作成（必要に応じて）
    if (createFolder) {
      try {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          
          // 必要なサブディレクトリも作成
          const subDirs = [
            path.join(fullPath, 'shared'),
            path.join(fullPath, 'users'),
            path.join(fullPath, 'config'),
            path.join(fullPath, 'backups'),
            path.join(fullPath, 'logs'),
          ];
          
          for (const dir of subDirs) {
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
          }
        }
      } catch (err) {
        console.error('[Save] フォルダ作成エラー:', err);
        return NextResponse.json(
          { success: false, error: `フォルダの作成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}` },
          { status: 500 }
        );
      }
    }

    // 設定を保存
    await saveDriveConfig({
      networkPath,
      driveLetter,
      fullPath,
      setupCompleted: true,
    });

    const deviceSetupCompleted = isDeviceSetupCompleted();
    const deviceToken = readDeviceToken();
    const hasDeviceToken = !!deviceToken;

    const { getDatabase } = await import('@/shared/lib/database/db');
    const db = getDatabase();
    const { count: totalUsers } = db
      .prepare('SELECT COUNT(*) as count FROM users')
      .get() as { count: number };

    const tokenInspection = inspectDeviceToken(db, deviceToken);

    if (deviceSetupCompleted && !hasDeviceToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            'この端末では初期設定が完了していますが、トークンファイルが見つかりません。管理者に問い合わせて再発行してください。',
          reason: 'TOKEN_MISSING_AFTER_SETUP',
        },
        { status: 409 }
      );
    }

    if (hasDeviceToken && (!tokenInspection.valid || !tokenInspection.userExists)) {
      return NextResponse.json(
        {
          success: false,
          error:
            '保存されているトークンが無効、またはユーザー情報と照合できません。管理者に問い合わせて再発行してください。',
          reason: 'INVALID_TOKEN_STATE',
        },
        { status: 409 }
      );
    }

    if (hasDeviceToken && tokenInspection.valid && tokenInspection.userExists) {
      if (!deviceSetupCompleted) {
        await markDeviceSetupCompleted();
        console.log('[Save] 端末フラグが未設定だったため、既存トークンを再利用して完了しました。');
      }

      return NextResponse.json({
        success: true,
        message: '設定を保存しました（既存トークンを利用します）',
        config: {
          networkPath,
          driveLetter,
          fullPath,
        },
        provisioning: {
          action: 'REUSE_EXISTING_TOKEN',
          userId: deviceToken!.user_id,
        },
      });
    }

    if (!hasDeviceToken && !deviceSetupCompleted) {
      const provisioningAction = totalUsers === 0 ? 'INITIAL_BOOTSTRAP' : 'NEW_DEVICE_USER';
      const provisionResult = await provisionUserAndToken(db, provisioningAction);
      await markDeviceSetupCompleted();

      return NextResponse.json({
        success: true,
        message: '設定を保存しました。新しいユーザーとトークンを発行しました。',
        config: {
          networkPath,
          driveLetter,
          fullPath,
        },
        provisioning: {
          action: provisioningAction,
          userId: provisionResult.userId,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '端末状態の判定に失敗しました。管理者にお問い合わせください。',
        reason: 'UNHANDLED_STATE',
      },
      { status: 409 }
    );
  } catch (err) {
    console.error('[API] /api/setup/save POST エラー:', err);
    return NextResponse.json(
      { success: false, error: '設定の保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

function inspectDeviceToken(
  db: Database.Database,
  token: DeviceTokenFile | null
): { valid: boolean; userExists: boolean } {
  if (!token) {
    return { valid: false, userExists: false };
  }

  try {
    if (!verifyTokenSignature(token)) {
      return { valid: false, userExists: false };
    }

    const tokenRecord = db
      .prepare('SELECT user_id, status FROM device_tokens WHERE token = ?')
      .get(token.token) as { user_id: string; status: string } | undefined;

    if (!tokenRecord || tokenRecord.status !== 'active') {
      return { valid: false, userExists: false };
    }

    const userRecord = db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(tokenRecord.user_id) as { id: string } | undefined;

    return { valid: true, userExists: !!userRecord };
  } catch (error) {
    console.error('[Save] トークン検証中にエラーが発生しました:', error);
    return { valid: false, userExists: false };
  }
}

async function provisionUserAndToken(
  db: Database.Database,
  action: 'INITIAL_BOOTSTRAP' | 'NEW_DEVICE_USER'
): Promise<{ userId: string; deviceTokenFile: DeviceTokenFile }> {
  const userId = randomUUID();
  const username =
    action === 'INITIAL_BOOTSTRAP'
      ? `admin_${userId.slice(0, 8)}`
      : `user_${userId.slice(0, 8)}`;
  const displayName =
    action === 'INITIAL_BOOTSTRAP' ? `Admin ${userId.slice(0, 6)}` : `User ${userId.slice(0, 6)}`;
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
  const signature = signToken({
    token: tokenValue,
    userId,
    issuedAt: now,
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
  ).run(tokenValue, userId, signature, deviceLabel, now, now);

  const deviceTokenFile: DeviceTokenFile = {
    schema_version: '1.0.0',
    token: tokenValue,
    signature,
    user_id: userId,
    issued_at: now,
    device_label: deviceLabel,
    signature_version: 1,
  };

  await writeDeviceToken(deviceTokenFile);

  console.log('[Save] 新しいユーザーとトークンを発行しました:', {
    userId,
    action,
  });

  return { userId, deviceTokenFile };
}

