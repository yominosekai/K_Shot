import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from '@/test/helpers/db-setup';
import Database from 'better-sqlite3';

describe('フォルダデータアクセス', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDatabase();
    
    // フォルダテーブルにテストデータを挿入
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO folders (id, name, parent_id, path, created_by, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('folder-1', 'フォルダ1', '', 'フォルダ1', 'user-1', now);
    
    db.prepare(`
      INSERT INTO folders (id, name, parent_id, path, created_by, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('folder-2', 'フォルダ2', 'folder-1', 'フォルダ1/フォルダ2', 'user-1', now);
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  it('フォルダ一覧を取得できる', () => {
    const folders = db.prepare('SELECT * FROM folders').all();
    
    expect(folders).toHaveLength(2);
    expect((folders[0] as any).name).toBe('フォルダ1');
    expect((folders[1] as any).name).toBe('フォルダ2');
  });

  it('親フォルダでフィルタリングできる', () => {
    const folders = db.prepare('SELECT * FROM folders WHERE parent_id = ?').all('folder-1');
    
    expect(folders).toHaveLength(1);
    expect((folders[0] as any).name).toBe('フォルダ2');
  });

  it('フォルダパスで検索できる', () => {
    const folder = db.prepare('SELECT * FROM folders WHERE path = ?').get('フォルダ1/フォルダ2') as any;
    
    expect(folder).toBeDefined();
    expect(folder.name).toBe('フォルダ2');
    expect(folder.parent_id).toBe('folder-1');
  });

  it('フォルダを作成できる', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO folders (id, name, parent_id, path, created_by, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('folder-3', 'フォルダ3', '', 'フォルダ3', 'user-1', now);
    
    const folders = db.prepare('SELECT * FROM folders').all();
    expect(folders).toHaveLength(3);
  });
});






