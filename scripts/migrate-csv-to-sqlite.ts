// CSVデータをSQLiteに移行するスクリプト

import { readCSV } from '../src/shared/lib/file-system/csv';
import { getDatabase } from '../src/shared/lib/database/db';
import { initializeSchema } from '../src/shared/lib/database/schema';
import { DRIVE_CONFIG } from '../src/config/drive';
import path from 'path';
import fs from 'fs/promises';

const MODULE_NAME = 'migrate';

/**
 * ファイルが存在するかチェック
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * カテゴリを移行
 */
async function migrateCategories(): Promise<void> {
  console.log('[migrate] カテゴリを移行中...');
  
  const drivePath = DRIVE_CONFIG.DATA_DIR;
  const csvPath = path.join(drivePath, 'shared', 'categories.csv');
  
  if (!(await fileExists(csvPath))) {
    console.log('[migrate] categories.csvが見つかりません。スキップします。');
    return;
  }

  const categories = await readCSV(csvPath);
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO categories (id, name, description, parent_id, level, created_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((cats: any[]) => {
    for (const cat of cats) {
      insert.run(
        cat.id,
        cat.name,
        cat.description || null,
        cat.parent_id || '',
        parseInt(cat.level || '0', 10),
        cat.created_date
      );
    }
  });

  insertMany(categories);
  console.log(`[migrate] カテゴリ ${categories.length}件を移行しました`);
}

/**
 * フォルダを移行
 */
async function migrateFolders(): Promise<void> {
  console.log('[migrate] フォルダを移行中...');
  
  const drivePath = DRIVE_CONFIG.DATA_DIR;
  const csvPath = path.join(drivePath, 'shared', 'shared_materials', 'folders.csv');
  
  if (!(await fileExists(csvPath))) {
    console.log('[migrate] folders.csvが見つかりません。スキップします。');
    return;
  }

  const folders = await readCSV(csvPath);
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO folders (id, name, parent_id, path, created_by, created_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((folders: any[]) => {
    for (const folder of folders) {
      insert.run(
        folder.id,
        folder.name,
        folder.parent_id || '',
        folder.path || '',
        folder.created_by,
        folder.created_date
      );
    }
  });

  insertMany(folders);
  console.log(`[migrate] フォルダ ${folders.length}件を移行しました`);
}

/**
 * 資料を移行
 */
async function migrateMaterials(): Promise<void> {
  console.log('[migrate] 資料を移行中...');
  
  const drivePath = DRIVE_CONFIG.DATA_DIR;
  const csvPath = path.join(drivePath, 'shared', 'shared_materials', 'materials.csv');
  
  if (!(await fileExists(csvPath))) {
    console.log('[migrate] materials.csvが見つかりません。スキップします。');
    return;
  }

  const materials = await readCSV(csvPath);
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO materials (
      id, uuid, title, description, category_id, type, difficulty, estimated_hours,
      tags, folder_path, created_by, created_date, updated_date,
      is_published, views, likes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((materials: any[]) => {
    for (const material of materials) {
      insert.run(
        material.id,
        material.uuid,
        material.title,
        material.description || null,
        material.category_id || null,
        material.type,
        material.difficulty || null,
        material.estimated_hours ? parseFloat(material.estimated_hours) : null,
        material.tags || '',
        material.folder_path || '',
        material.created_by,
        material.created_date,
        material.updated_date,
        material.is_published === 'true' || material.is_published === true ? 1 : 0,
        parseInt(material.views || '0', 10),
        parseInt(material.likes || '0', 10)
      );
    }
  });

  insertMany(materials);
  console.log(`[migrate] 資料 ${materials.length}件を移行しました`);
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('[migrate] データベーススキーマを初期化中...');
    initializeSchema();
    
    console.log('[migrate] CSVデータをSQLiteに移行開始...');
    await migrateCategories();
    await migrateFolders();
    await migrateMaterials();
    
    console.log('[migrate] 移行が完了しました！');
  } catch (err) {
    console.error('[migrate] 移行エラー:', err);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

