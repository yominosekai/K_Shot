// 自動バックアップAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabasePath } from '@/shared/lib/database/db';
import fs from 'fs';
import path from 'path';
import { DRIVE_CONFIG } from '@/config/drive';

const MODULE_NAME = 'api/admin/backup/auto';

/**
 * POST /api/admin/backup/auto
 * 自動バックアップを実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { savePath } = body;

    const dbPath = getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { success: false, error: 'データベースファイルが見つかりません' },
        { status: 404 }
      );
    }

    // 保存先パスを構築
    const basePath = DRIVE_CONFIG.DATA_DIR;
    const backupDir = path.join(basePath, savePath || 'backups');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // バックアップファイル名（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `k_shot_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // データベースファイルをコピー
    fs.copyFileSync(dbPath, backupPath);

    // 古いバックアップを削除（30日以上前）
    const retentionDays = 30;
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - retentionDays);

    const files = fs.readdirSync(backupDir);
    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('k_shot_backup_') || !file.endsWith('.db')) {
        continue;
      }

      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const fileDate = new Date(stats.mtime);

      if (fileDate < retentionDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: '自動バックアップが完了しました',
      backupPath: backupFileName,
      deletedCount,
    });
  } catch (err) {
    console.error('[API] /api/admin/backup/auto POST エラー:', err);
    return NextResponse.json(
      { success: false, error: '自動バックアップの作成に失敗しました' },
      { status: 500 }
    );
  }
}

