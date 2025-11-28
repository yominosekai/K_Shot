// カテゴリ初期化スクリプト
// oldフォルダの設定を参考にしてcategories.csvを作成

import { writeCSV } from '../src/shared/lib/file-system/csv';
import { DRIVE_CONFIG } from '../src/config/drive';
import path from 'path';
import fs from 'fs';

// oldフォルダのconfig.tsから取得したデフォルトカテゴリ
const defaultCategories = [
  { id: '1', name: 'スレッドハンティング', description: '脅威の能動的な探索と検出', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '2', name: 'マルウェア解析', description: 'マルウェアの動作解析と対策', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '3', name: 'インシデント対応', description: 'セキュリティインシデントへの対応と復旧', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '4', name: 'デジタルフォレンジック', description: 'デジタル証拠の収集と分析', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '5', name: 'ペネトレーションテスト', description: 'セキュリティ脆弱性の検証と評価', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '6', name: 'SOC運用', description: 'セキュリティオペレーションセンターの運用', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '7', name: 'ネットワークセキュリティ', description: 'ネットワークレベルのセキュリティ対策', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '8', name: 'アプリケーションセキュリティ', description: 'アプリケーションレベルのセキュリティ対策', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '9', name: 'クラウドセキュリティ', description: 'クラウド環境のセキュリティ対策', parent_id: '', level: '1', created_date: new Date().toISOString() },
  { id: '10', name: 'セキュリティ運用', description: 'セキュリティの日常的な運用と管理', parent_id: '', level: '1', created_date: new Date().toISOString() },
];

async function initCategories() {
  try {
    const csvPath = path.join(DRIVE_CONFIG.DATA_DIR, 'shared', 'categories.csv');
    
    // 既にファイルが存在する場合はスキップ
    if (fs.existsSync(csvPath)) {
      console.log(`categories.csvは既に存在します: ${csvPath}`);
      return;
    }

    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(csvPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`ディレクトリを作成しました: ${dir}`);
    }

    // CSVファイルを作成
    await writeCSV(csvPath, defaultCategories);
    console.log(`categories.csvを作成しました: ${csvPath}`);
    console.log(`${defaultCategories.length}件のカテゴリを追加しました`);
  } catch (error) {
    console.error('カテゴリ初期化エラー:', error);
    throw error;
  }
}

// スクリプトを実行
initCategories()
  .then(() => {
    console.log('カテゴリ初期化が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('カテゴリ初期化に失敗しました:', error);
    process.exit(1);
  });

