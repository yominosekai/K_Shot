// ドライブ設定確認API Route

import { NextRequest, NextResponse } from 'next/server';
import { getDriveConfig, getAvailableDriveLetters } from '@/shared/lib/utils/drive-config';
import { readDeviceToken, verifyTokenSignature } from '@/shared/lib/auth/device-token';
import { isDeviceSetupCompleted } from '@/shared/lib/auth/device-setup';
import { getDatabase } from '@/shared/lib/database/db';
import fs from 'fs';
import { SUB_FOLDER } from '@/config/drive';

const MODULE_NAME = 'api/setup/check';
let hasWarnedMissingDrive = false;

/**
 * GET /api/setup/check
 * ドライブ設定の状態を確認
 * 設定が存在する場合、実際のドライブパスとディレクトリの存在もチェック
 */
export async function GET(request: NextRequest) {
  try {
    const config = getDriveConfig();
    const availableDriveLetters = getAvailableDriveLetters();

    let isSetupCompleted = false;
    
    // 設定が存在する場合、実際のパスとディレクトリの存在をチェック
    if (config && config.setupCompleted === true) {
      try {
        const drivePath = `${config.driveLetter}:\\`;
        const folderPath = `${drivePath}${SUB_FOLDER}`;
        
        // ドライブとディレクトリの存在を確認
        const driveExists = fs.existsSync(drivePath);
        const folderExists = fs.existsSync(folderPath);
        
        // 両方存在する場合のみ設定完了とみなす
        isSetupCompleted = driveExists && folderExists;
        
        // 存在しない場合は警告を出力
        if (!isSetupCompleted && !hasWarnedMissingDrive) {
          console.info(
            `[${MODULE_NAME}] ドライブまたはディレクトリが存在しません: drivePath=${drivePath}, folderPath=${folderPath}, driveExists=${driveExists}, folderExists=${folderExists}`
          );
          hasWarnedMissingDrive = true;
        }
      } catch (err) {
        console.error(`[${MODULE_NAME}] パス確認エラー:`, err);
        // エラーが発生した場合は安全側に倒す
        isSetupCompleted = false;
      }
    }

    // トークンファイルの状態を確認
    let tokenStatus: {
      exists: boolean;
      validInDb: boolean;
    } | null = null;
    
    try {
      const token = readDeviceToken();
      if (token) {
        // トークンファイルが存在する場合、DBでの検証を試行
        let validInDb = false;
        try {
          if (verifyTokenSignature(token)) {
            const db = getDatabase();
            const tokenRecord = db.prepare(
              'SELECT status FROM device_tokens WHERE token = ?'
            ).get(token.token) as { status: string } | undefined;
            validInDb = !!tokenRecord && tokenRecord.status === 'active';
          }
        } catch (err) {
          // DB接続エラーなどは無視（ドライブ設定未完了の可能性がある）
        }
        
        tokenStatus = {
          exists: true,
          validInDb,
        };
      } else {
        tokenStatus = {
          exists: false,
          validInDb: false,
        };
      }
    } catch (err) {
      // トークンファイルの読み込みエラーは無視
      tokenStatus = {
        exists: false,
        validInDb: false,
      };
    }

    // 端末で初期設定が完了しているか確認
    const deviceSetupCompleted = isDeviceSetupCompleted();

    return NextResponse.json({
      success: true,
      isSetupCompleted,
      config: config || null,
      availableDriveLetters,
      tokenStatus,
      deviceSetupCompleted, // 端末単位の初期設定完了フラグ
    });
  } catch (err) {
    console.error(`[${MODULE_NAME}] GET エラー:`, err);
    return NextResponse.json(
      { success: false, error: '設定の確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

