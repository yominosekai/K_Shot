// データベース復元API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabasePath } from '@/shared/lib/database/db';
import fs from 'fs';
import path from 'path';
import { DRIVE_CONFIG } from '@/config/drive';

const MODULE_NAME = 'api/admin/backup/restore';

/**
 * POST /api/admin/backup/restore
 * データベースを復元（アップロードされたバックアップファイルから）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイル拡張子のチェック
    if (!file.name.endsWith('.db')) {
      return NextResponse.json(
        { success: false, error: 'データベースファイル（.db）のみアップロード可能です' },
        { status: 400 }
      );
    }

    const dbPath = getDatabasePath();
    
    // 復元前に自動バックアップを作成
    const backupDir = path.join(DRIVE_CONFIG.DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const preRestoreBackupPath = path.join(
      backupDir,
      `k_shot_backup_before_restore_${timestamp}.db`
    );

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, preRestoreBackupPath);
    }

    // アップロードされたファイルをバッファに読み込む
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // データベースファイルを上書き
    fs.writeFileSync(dbPath, buffer);

    return NextResponse.json({
      success: true,
      message: 'データベースの復元が完了しました。ページをリロードしてください。',
      preRestoreBackup: path.basename(preRestoreBackupPath),
    });
  } catch (err) {
    console.error('[API] /api/admin/backup/restore POST エラー:', err);
    return NextResponse.json(
      { success: false, error: 'データベースの復元に失敗しました' },
      { status: 500 }
    );
  }
}

