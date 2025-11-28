// データベースの内容を確認するスクリプト

import { getDatabase } from '../src/shared/lib/database/db';
import { initializeSchema } from '../src/shared/lib/database/schema';

async function main() {
  try {
    console.log('[check] データベース接続中...');
    initializeSchema();
    const db = getDatabase();

    // 資料数を確認
    const materialCount = db.prepare('SELECT COUNT(*) as count FROM materials').get() as { count: number };
    console.log(`[check] 資料数: ${materialCount.count}件`);

    // 最新の資料を確認
    const latestMaterials = db.prepare(`
      SELECT id, title, folder_path, created_date 
      FROM materials 
      ORDER BY created_date DESC 
      LIMIT 5
    `).all() as any[];

    console.log('\n[check] 最新の資料（上位5件）:');
    latestMaterials.forEach((m, i) => {
      console.log(`  ${i + 1}. ID: ${m.id}, タイトル: ${m.title}, フォルダ: ${m.folder_path || '(未分類)'}, 作成日: ${m.created_date}`);
    });

    // フォルダ数を確認
    const folderCount = db.prepare('SELECT COUNT(*) as count FROM folders').get() as { count: number };
    console.log(`\n[check] フォルダ数: ${folderCount.count}件`);

    // カテゴリ数を確認
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    console.log(`\n[check] カテゴリ数: ${categoryCount.count}件`);

    // カテゴリの詳細を確認
    const categories = db.prepare('SELECT * FROM categories ORDER BY level, name').all() as any[];
    console.log('\n[check] カテゴリ一覧:');
    categories.forEach((cat, i) => {
      console.log(`  ${i + 1}. ID: ${cat.id}, 名前: ${cat.name}, 説明: ${cat.description || '(なし)'}, レベル: ${cat.level}, 親ID: ${cat.parent_id || '(なし)'}`);
    });

    // タイプ数を確認
    const typeCount = db.prepare('SELECT COUNT(*) as count FROM material_types').get() as { count: number };
    console.log(`\n[check] 資料タイプ数: ${typeCount.count}件`);

    // タイプの詳細を確認
    const types = db.prepare('SELECT * FROM material_types ORDER BY sort_order, name').all() as any[];
    console.log('\n[check] 資料タイプ一覧:');
    types.forEach((type, i) => {
      console.log(`  ${i + 1}. ID: ${type.id}, 名前: ${type.name}, 表示名: ${type.display_name}, 説明: ${type.description || '(なし)'}`);
    });

    // 難易度数を確認
    const difficultyCount = db.prepare('SELECT COUNT(*) as count FROM difficulty_levels').get() as { count: number };
    console.log(`\n[check] 難易度数: ${difficultyCount.count}件`);

    // 難易度の詳細を確認
    const difficulties = db.prepare('SELECT * FROM difficulty_levels ORDER BY sort_order, name').all() as any[];
    console.log('\n[check] 難易度一覧:');
    difficulties.forEach((diff, i) => {
      console.log(`  ${i + 1}. ID: ${diff.id}, 名前: ${diff.name}, 表示名: ${diff.display_name}, 説明: ${diff.description || '(なし)'}`);
    });

    console.log('\n[check] 確認完了！');
  } catch (err) {
    console.error('[check] エラー:', err);
    process.exit(1);
  }
}

main();

