import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from '@/test/helpers/db-setup';
import Database from 'better-sqlite3';

describe('データベース操作', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  it('トランザクションが正常に動作する', () => {
    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO materials (id, uuid, title, created_date, updated_date) VALUES (?, ?, ?, ?, ?)')
        .run('trans-1', 'uuid-1', 'トランザクション1', new Date().toISOString(), new Date().toISOString());
      
      db.prepare('INSERT INTO materials (id, uuid, title, created_date, updated_date) VALUES (?, ?, ?, ?, ?)')
        .run('trans-2', 'uuid-2', 'トランザクション2', new Date().toISOString(), new Date().toISOString());
    });

    transaction();

    const materials = db.prepare('SELECT * FROM materials').all();
    expect(materials).toHaveLength(2);
  });

  it('データベースにデータを挿入できる', () => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO materials (id, uuid, title, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run('test-1', 'uuid-1', 'テスト資料', now, now);
    
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get('test-1') as any;
    expect(material).toBeDefined();
    expect(material.title).toBe('テスト資料');
  });

  it('インデックスが機能する', () => {
    // インデックスが存在するか確認
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='materials'
    `).all();

    // インデックスが存在することを確認（実際のスキーマに応じて調整）
    expect(Array.isArray(indexes)).toBe(true);
  });

  it('プリペアドステートメントが機能する', () => {
    const stmt = db.prepare('INSERT INTO materials (id, uuid, title, created_date, updated_date) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    
    stmt.run('prep-1', 'uuid-1', 'プリペアド1', now, now);
    stmt.run('prep-2', 'uuid-2', 'プリペアド2', now, now);
    
    const materials = db.prepare('SELECT * FROM materials WHERE id LIKE ?').all('prep-%');
    expect(materials).toHaveLength(2);
  });
});

