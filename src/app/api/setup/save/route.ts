// ドライブ設定保存API Route

import { NextRequest, NextResponse } from 'next/server';
import { saveDriveConfig } from '@/shared/lib/utils/drive-config';
import { SUB_FOLDER } from '@/config/drive';
import { readDeviceToken } from '@/shared/lib/auth/device-token';
import fs from 'fs';
import path from 'path';
import { fetch as nextFetch } from 'next/dist/compiled/@edge-runtime/primitives/fetch';

const MODULE_NAME = 'api/setup/save';

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

    // 証明ファイルがインポートされているか確認
    const deviceToken = readDeviceToken();
    
    if (deviceToken) {
      // 証明ファイルが存在する場合、新規ユーザー作成をスキップ
      // 既存ユーザーとして利用可能
      console.log('[Save] 証明ファイルが検出されました。新規ユーザー作成をスキップします。');
    } else {
      // 証明ファイルが存在しない場合、初回セットアップ（DBにユーザーが0人）の場合のみ自動ブートストラップを実行
      const { getDatabase } = await import('@/shared/lib/database/db');
      const db = getDatabase();
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      
      if (userCount.count === 0) {
        // 初回セットアップ（DBにユーザーが0人）の場合のみ、自動ブートストラップを実行
        const bootstrapUrl = new URL('/api/setup/bootstrap-user', request.url);
        const bootstrapResponse = await nextFetch(bootstrapUrl.toString(), {
          method: 'POST',
        });

        if (!bootstrapResponse.ok) {
          const errorBody = await bootstrapResponse.json().catch(() => ({}));
          return NextResponse.json(
            {
              success: false,
              error: errorBody.error || '初期ユーザーの作成に失敗しました',
            },
            { status: 500 }
          );
        }

        // 端末の初期設定完了フラグを保存
        const { markDeviceSetupCompleted } = await import('@/shared/lib/auth/device-setup');
        await markDeviceSetupCompleted();
      } else {
        // DBにユーザーが存在する場合（トークンファイル紛失など）、自動発行しない
        // 管理者に問い合わせが必要
        console.log('[Save] 証明ファイルが存在しませんが、DBにユーザーが存在するため、新規ユーザー作成をスキップします。管理者に問い合わせてください。');
      }
    }

    return NextResponse.json({
      success: true,
      message: '設定を保存しました',
      config: {
        networkPath,
        driveLetter,
        fullPath,
      },
    });
  } catch (err) {
    console.error('[API] /api/setup/save POST エラー:', err);
    return NextResponse.json(
      { success: false, error: '設定の保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

