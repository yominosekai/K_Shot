// スキルマッピングデータベースの内容を確認するスクリプト

import { getDatabase } from '../src/shared/lib/database/db';

async function main() {
  try {
    const db = getDatabase();

    console.log('=== スキルマッピングデータベース確認 ===\n');

    // テーブル構造を確認
    console.log('【テーブル構造】');
    const tableInfo = db.prepare('PRAGMA table_info(skill_phase_items)').all();
    console.log(JSON.stringify(tableInfo, null, 2));
    console.log('\n');

    // データ件数を確認
    const count = db.prepare('SELECT COUNT(*) as count FROM skill_phase_items').get() as { count: number };
    console.log(`【データ件数】: ${count.count}件\n`);

    // display_orderの分布を確認
    console.log('【display_orderの分布】');
    const orderStats = db
      .prepare(`
        SELECT 
          display_order,
          COUNT(*) as count
        FROM skill_phase_items
        GROUP BY display_order
        ORDER BY display_order
      `)
      .all();
    console.log(JSON.stringify(orderStats, null, 2));
    console.log('\n');

    // display_orderがNULLの件数
    const nullCount = db
      .prepare('SELECT COUNT(*) as count FROM skill_phase_items WHERE display_order IS NULL')
      .get() as { count: number };
    console.log(`【display_orderがNULLの件数】: ${nullCount.count}件\n`);

    // display_orderがNULL以外の件数
    const notNullCount = db
      .prepare('SELECT COUNT(*) as count FROM skill_phase_items WHERE display_order IS NOT NULL')
      .get() as { count: number };
    console.log(`【display_orderがNULL以外の件数】: ${notNullCount.count}件\n`);

    // サンプルデータを表示（最初の10件）
    console.log('【サンプルデータ（最初の10件）】');
    const samples = db
      .prepare(`
        SELECT 
          id,
          category,
          item,
          sub_category,
          small_category,
          phase,
          name,
          display_order
        FROM skill_phase_items
        ORDER BY id
        LIMIT 10
      `)
      .all();
    console.log(JSON.stringify(samples, null, 2));
    console.log('\n');

    // display_orderが設定されているサンプル（最初の10件）
    console.log('【display_orderが設定されているサンプル（最初の10件）】');
    const withOrder = db
      .prepare(`
        SELECT 
          id,
          category,
          item,
          sub_category,
          small_category,
          phase,
          name,
          display_order
        FROM skill_phase_items
        WHERE display_order IS NOT NULL
        ORDER BY display_order, id
        LIMIT 10
      `)
      .all();
    console.log(JSON.stringify(withOrder, null, 2));
    console.log('\n');

    // 中分類ごとにグループ化して、display_orderの値を確認
    console.log('【中分類ごとのdisplay_order確認（最初の10グループ）】');
    const grouped = db
      .prepare(`
        SELECT 
          category,
          item,
          sub_category,
          MIN(display_order) as min_display_order,
          MAX(display_order) as max_display_order,
          COUNT(DISTINCT display_order) as distinct_order_count,
          COUNT(*) as item_count
        FROM skill_phase_items
        GROUP BY category, item, sub_category
        ORDER BY category, item, sub_category
        LIMIT 10
      `)
      .all();
    console.log(JSON.stringify(grouped, null, 2));
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

main();

