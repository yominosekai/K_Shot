// デバイストークン証明ファイルインポートAPI

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { verifyTokenSignature, writeDeviceToken, type DeviceTokenFile } from '@/shared/lib/auth/device-token';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/device-tokens/import';

/**
 * POST /api/users/device-tokens/import
 * 証明ファイルをインポートしてローカルに保存
 * 初期セットアップ時にも使用可能（認証不要）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェックは不要（初期セットアップ時にも使用するため）

    const body = await request.json();
    const { device_token_file } = body;

    if (!device_token_file) {
      return NextResponse.json(
        { success: false, error: '証明ファイルの内容が指定されていません' },
        { status: 400 }
      );
    }

    // 必須フィールドの検証
    const requiredFields = ['schema_version', 'token', 'signature', 'user_sid', 'issued_at'];
    for (const field of requiredFields) {
      if (!device_token_file[field]) {
        return NextResponse.json(
          { success: false, error: `必須フィールドが不足しています: ${field}` },
          { status: 400 }
        );
      }
    }

    // 署名の検証
    const tokenFile: DeviceTokenFile = {
      schema_version: device_token_file.schema_version,
      token: device_token_file.token,
      signature: device_token_file.signature,
      user_sid: device_token_file.user_sid,
      issued_at: device_token_file.issued_at,
      device_label: device_token_file.device_label,
      signature_version: device_token_file.signature_version || 1,
    };

    if (!verifyTokenSignature(tokenFile)) {
      return NextResponse.json(
        { success: false, error: '証明ファイルの署名検証に失敗しました。ファイルが改ざんされている可能性があります。' },
        { status: 400 }
      );
    }

    // データベースでトークンの存在とステータスを確認
    const db = getDatabase();
    const tokenRecord = db.prepare(
      'SELECT token, status FROM device_tokens WHERE token = ?'
    ).get(tokenFile.token) as { token: string; status: string } | undefined;

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'この証明ファイルのトークンはデータベースに見つかりません' },
        { status: 404 }
      );
    }

    if (tokenRecord.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'この証明ファイルのトークンは失効しています。管理者に連絡して再発行してください。' },
        { status: 403 }
      );
    }

    // ローカルに証明ファイルを保存
    try {
      await writeDeviceToken(tokenFile);
      debug(MODULE_NAME, `証明ファイルをインポートしました: token=${tokenFile.token}, user_sid=${tokenFile.user_sid}`);
    } catch (writeError) {
      error(MODULE_NAME, '証明ファイルの保存に失敗しました:', writeError);
      return NextResponse.json(
        { success: false, error: '証明ファイルの保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '証明ファイルをインポートしました',
    });
  } catch (err) {
    error(MODULE_NAME, '証明ファイルインポートエラー:', err);
    return NextResponse.json(
      { success: false, error: '証明ファイルのインポートに失敗しました' },
      { status: 500 }
    );
  }
}

