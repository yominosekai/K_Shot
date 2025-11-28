// インデックスの使用状況を確認するスクリプト

import { getDatabase } from '../src/shared/lib/database/db';

const MODULE_NAME = 'check-indexes';

/**
 * インデックスの使用状況を確認
 */
async function checkIndexUsage() {
  try {
    const db = getDatabase();
    
    console.log('=== インデックス一覧 ===');
    const indexes = db.prepare(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='index' AND tbl_name='materials'
      ORDER BY name
    `).all() as Array<{ name: string; tbl_name: string; sql: string | null }>;
    
    indexes.forEach(idx => {
      console.log(`- ${idx.name} (${idx.tbl_name})`);
    });
    
    console.log('\n=== クエリ実行計画の確認 ===\n');
    
    // 1. カテゴリでフィルター（インデックスあり）
    console.log('1. カテゴリでフィルター:');
    const plan1 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      WHERE category_id = '1'
      ORDER BY updated_date DESC
    `).all() as Array<{ detail: string }>;
    plan1.forEach(row => console.log(`   ${row.detail}`));
    
    // 2. タイプでフィルター（インデックスなし）
    console.log('\n2. タイプでフィルター（インデックスなし）:');
    const plan2 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      WHERE type = 'ドキュメント'
      ORDER BY updated_date DESC
    `).all() as Array<{ detail: string }>;
    plan2.forEach(row => console.log(`   ${row.detail}`));
    
    // 3. 作成者でフィルター（インデックスあり）
    console.log('\n3. 作成者でフィルター:');
    const plan3 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      WHERE created_by = 'S-1-5-21-1234567890-1234567890-1234567890-1001'
      ORDER BY updated_date DESC
    `).all() as Array<{ detail: string }>;
    plan3.forEach(row => console.log(`   ${row.detail}`));
    
    // 4. フォルダパスでフィルター（インデックスあり）
    console.log('\n4. フォルダパスでフィルター:');
    const plan4 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      WHERE folder_path LIKE 'セキュリティ基礎%'
      ORDER BY updated_date DESC
    `).all() as Array<{ detail: string }>;
    plan4.forEach(row => console.log(`   ${row.detail}`));
    
    // 5. updated_dateでソート（インデックスあり）
    console.log('\n5. updated_dateでソート:');
    const plan5 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      ORDER BY updated_date DESC
      LIMIT 10
    `).all() as Array<{ detail: string }>;
    plan5.forEach(row => console.log(`   ${row.detail}`));
    
    // 6. 複合条件（カテゴリ + タイプ）
    console.log('\n6. 複合条件（カテゴリ + タイプ）:');
    const plan6 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      WHERE category_id = '1' AND type = 'ドキュメント'
      ORDER BY updated_date DESC
    `).all() as Array<{ detail: string }>;
    plan6.forEach(row => console.log(`   ${row.detail}`));
    
    // 7. LIKE検索（インデックスが効かない）
    console.log('\n7. LIKE検索（タイトル）:');
    const plan7 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM materials 
      WHERE LOWER(title) LIKE '%資料%'
      ORDER BY updated_date DESC
    `).all() as Array<{ detail: string }>;
    plan7.forEach(row => console.log(`   ${row.detail}`));
    
    console.log('\n=== 解釈 ===');
    console.log('- "SEARCH TABLE ... USING INDEX" と表示されればインデックスが使用されている');
    console.log('- "SCAN TABLE" と表示されればフルスキャン（インデックス未使用）');
    console.log('- "USE TEMP B-TREE" と表示されれば一時的なソートが必要');
    
  } catch (err) {
    console.error(`[${MODULE_NAME}] エラー:`, err);
    process.exit(1);
  }
}

// 実行
checkIndexUsage().then(() => {
  console.log('\n確認完了');
  process.exit(0);
}).catch((err) => {
  console.error(`[${MODULE_NAME}] 実行エラー:`, err);
  process.exit(1);
});

