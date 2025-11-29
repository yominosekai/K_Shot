import Database from 'better-sqlite3';
import { unlinkSync, existsSync } from 'fs';
import path from 'path';

// 各テストで一意のDBファイル名を使用（ロック競合を回避）
function getTestDbPath(): string {
  const testId = Math.random().toString(36).substring(7);
  return path.resolve(__dirname, '../../../test-data', `test-${testId}.db`);
}

/**
 * テスト用データベースを作成
 */
export function createTestDatabase(): Database.Database {
  const dbPath = getTestDbPath();
  
  // 既存のテストDBを削除（ロックされている場合はスキップ）
  if (existsSync(dbPath)) {
    try {
      unlinkSync(dbPath);
    } catch (err) {
      // 削除に失敗しても続行（上書きされる）
      console.warn('Failed to delete existing test database:', err);
    }
  }
  
  // 新しいテストDBを作成
  const db = new Database(dbPath);
  
  // DBパスをDBオブジェクトに保存（クリーンアップ時に使用）
  (db as any).__testDbPath = dbPath;
  
  // 基本的なスキーマを初期化（必要に応じて拡張）
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      uuid TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      type TEXT,
      folder_path TEXT,
      created_by TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      path TEXT,
      created_by TEXT,
      created_date TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      level INTEGER DEFAULT 0,
      created_date TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      department_id TEXT,
      department TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_date TEXT NOT NULL,
      last_login TEXT,
      avatar TEXT,
      bio TEXT,
      skills TEXT,
      certifications TEXT,
      mos TEXT
    );
  `);
  
  return db;
}

/**
 * テスト用データベースをクリーンアップ
 */
export function cleanupTestDatabase(db: Database.Database) {
  try {
    const dbPath = (db as any).__testDbPath;
    db.close();
    
    // WindowsではDBファイルがロックされている可能性があるため、少し待ってから削除
    setTimeout(() => {
      if (dbPath && existsSync(dbPath)) {
        try {
          unlinkSync(dbPath);
        } catch (err) {
          // 削除に失敗してもエラーにしない（次のテストで上書きされる）
          console.warn('Failed to delete test database:', err);
        }
      }
    }, 100);
  } catch (err) {
    console.warn('Failed to close test database:', err);
  }
}

