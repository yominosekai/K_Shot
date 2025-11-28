import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from '@/test/helpers/db-setup';
import Database from 'better-sqlite3';

describe('資料データアクセス', () => {
  let db: Database.Database;

  beforeEach(() => {
    // テストごとに新しいDBを作成
    db = createTestDatabase();
  });

  afterEach(() => {
    // テスト後にDBをクリーンアップ
    cleanupTestDatabase(db);
  });

  it('テスト用データベースが作成できる', () => {
    expect(db).toBeDefined();
    
    // テーブルが存在するか確認
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('materials', 'folders', 'categories', 'users')
    `).all();
    
    expect(tables).toHaveLength(4);
  });

  it('資料をデータベースに挿入できる', () => {
    const materialId = 'test-material-1';
    const title = 'テスト資料';
    const createdDate = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO materials (id, uuid, title, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(materialId, 'test-uuid', title, createdDate, createdDate);
    
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any;
    
    expect(material).toBeDefined();
    expect(material.title).toBe(title);
    expect(material.id).toBe(materialId);
  });

  it('資料一覧を取得できる', () => {
    // テストデータを挿入
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO materials (id, uuid, title, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?)
    `).run('test-1', 'uuid-1', 'テスト資料1', now, now);
    
    db.prepare(`
      INSERT INTO materials (id, uuid, title, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?)
    `).run('test-2', 'uuid-2', 'テスト資料2', now, now);
    
    const materials = db.prepare('SELECT * FROM materials').all();
    
    expect(materials).toHaveLength(2);
    expect((materials[0] as any).title).toBe('テスト資料1');
    expect((materials[1] as any).title).toBe('テスト資料2');
  });
});

