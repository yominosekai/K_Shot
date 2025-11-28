// SQLiteデータベース接続とユーティリティ

import Database from 'better-sqlite3';
import path from 'path';
import { DRIVE_CONFIG } from '@/config/drive';
import { info, error, debug } from '../logger';
import { initializeSchema } from './schema';

const MODULE_NAME = 'database';

// エラーログを1回だけ出力するためのフラグ
let hasLoggedDatabasePathError = false;

/**
 * データベースファイルのパスを取得
 */
export function getDatabasePath(): string {
  const drivePath = DRIVE_CONFIG.DATA_DIR;

  const fs = require('fs');
  const driveRoot = path.parse(drivePath).root || drivePath;
  const driveExists = fs.existsSync(driveRoot);
  const dataDirExists = driveExists && fs.existsSync(drivePath);

  if (!driveExists || !dataDirExists) {
    if (!hasLoggedDatabasePathError) {
      const message = !driveExists
        ? `ネットワークドライブが見つかりませんでした (${driveRoot})。初期設定を実行してください。`
        : `データディレクトリが見つかりませんでした (${drivePath})。初期設定を実行してください。`;
      info(MODULE_NAME, message);
      hasLoggedDatabasePathError = true;
    }
    throw new Error(`ドライブが存在しません: ${drivePath}`);
  }

  return path.join(drivePath, 'shared', 'k_shot.db');
}

/**
 * データベース接続を取得（シングルトン）
 */
let dbInstance: Database.Database | null = null;
let schemaInitialized = false;

export function getDatabase(): Database.Database {
  // 既存のインスタンスがある場合でも、ドライブの存在を確認
  let dbPath: string;
  try {
    dbPath = getDatabasePath();
  } catch (err) {
    // ドライブ設定が完了していない、またはドライブが存在しない場合
    // 既存のインスタンスをクリア
    if (dbInstance) {
      try {
        dbInstance.close();
      } catch (closeErr) {
        // クローズエラーは無視
      }
      dbInstance = null;
      schemaInitialized = false;
    }
    // エラーログはgetDatabasePath()内で既に出力されているため、ここでは出力しない
    throw err;
  }
  
  // 既存のインスタンスがあり、パスが同じ場合は再利用
  if (dbInstance) {
    return dbInstance;
  }
  
  // ディレクトリが存在しない場合は作成
  const dbDir = path.dirname(dbPath);
  
  // 同期的にディレクトリを作成（better-sqlite3は同期的なので）
  try {
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      debug(MODULE_NAME, `データベースディレクトリを作成: ${dbDir}`);
    }
  } catch (err) {
    error(MODULE_NAME, 'データベースディレクトリの作成に失敗:', err);
    throw err;
  }

  try {
    dbInstance = new Database(dbPath);
    
    // ネットワークドライブ上での共有を優先し、DELETEモードを強制
    // WALモードはSMB共有で同期が不安定になるため無効化する
    dbInstance.pragma('journal_mode = DELETE');
    
    // 外部キー制約を有効化
    dbInstance.pragma('foreign_keys = ON');
    
    // スキーマを初期化（初回のみ）
    if (!schemaInitialized) {
      initializeSchema();
      schemaInitialized = true;
    }
    
    debug(MODULE_NAME, `データベース接続成功: ${dbPath}`);
    return dbInstance;
  } catch (err) {
    error(MODULE_NAME, 'データベース接続エラー:', err);
    throw err;
  }
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    debug(MODULE_NAME, 'データベース接続を閉じました');
  }
}

