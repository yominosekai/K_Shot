// データベースバックアップAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabasePath } from '@/shared/lib/database/db';
import fs from 'fs';
import path from 'path';
import { DRIVE_CONFIG } from '@/config/drive';

const MODULE_NAME = 'api/admin/backup';

/**
 * GET /api/admin/backup
 * データベースのバックアップファイルをダウンロード
 */
export async function GET(request: NextRequest) {
  try {
    const dbPath = getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { success: false, error: 'データベースファイルが見つかりません' },
        { status: 404 }
      );
    }

    // データベースファイルを読み込む
    const dbBuffer = fs.readFileSync(dbPath);
    
    // レスポンスヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="k_shot_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.db"`
    );

    return new NextResponse(dbBuffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[API] /api/admin/backup GET エラー:', err);
    return NextResponse.json(
      { success: false, error: 'バックアップの作成に失敗しました' },
      { status: 500 }
    );
  }
}

