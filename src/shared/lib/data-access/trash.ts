// ゴミ箱管理のデータアクセス層

import { readCSV, writeCSV } from '../file-system/csv';
import { readJSON, writeJSON } from '../file-system/json';
import path from 'path';
import fs from 'fs/promises';
import { debug, info, error } from '../logger';

const MODULE_NAME = 'trash';

// ローカルのゴミ箱ディレクトリ
const TRASH_DIR = path.join(process.cwd(), 'data', 'trash');
const TRASH_CSV = path.join(TRASH_DIR, 'trash.csv');

export interface TrashItem {
  id: string; // ゴミ箱ID（主キー）
  type: 'material' | 'folder'; // タイプ
  original_id: string; // 元のID
  original_path: string; // 元の完全パス（Z:\k_shot\shared\shared_materials\...）
  original_name: string; // 元の名前
  trash_name: string; // ゴミ箱での名前（連番付きの場合あり）
  deleted_by: string; // 削除したユーザーのID
  deleted_date: string; // 削除日時（ISO形式）
  original_folder_path?: string; // フォルダパス（資料の場合）
}

/**
 * ゴミ箱ディレクトリを初期化
 */
async function ensureTrashDir(): Promise<void> {
  try {
    await fs.mkdir(TRASH_DIR, { recursive: true });
    if (!(await fileExists(TRASH_CSV))) {
      // 空のCSVファイルを作成
      await writeCSV(TRASH_CSV, []);
    }
  } catch (err) {
    error(MODULE_NAME, 'ゴミ箱ディレクトリの作成に失敗:', err);
    throw err;
  }
}

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
 * 同名ファイル/フォルダがある場合の連番を生成
 */
async function generateUniqueName(baseName: string, isFolder: boolean): Promise<string> {
  await ensureTrashDir();
  
  const items = await getTrashItems();
  let counter = 1;
  let uniqueName = baseName;

  while (true) {
    const exists = items.some((item) => {
      if (isFolder && item.type !== 'folder') return false;
      if (!isFolder && item.type !== 'material') return false;
      return item.trash_name === uniqueName;
    });

    if (!exists) {
      break;
    }

    const ext = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, ext);
    uniqueName = `${nameWithoutExt}(${counter})${ext}`;
    counter++;
  }

  return uniqueName;
}

/**
 * ゴミ箱アイテム一覧を取得
 */
export async function getTrashItems(): Promise<TrashItem[]> {
  try {
    await ensureTrashDir();

    if (!(await fileExists(TRASH_CSV))) {
      return [];
    }

    const items = await readCSV(TRASH_CSV);
    return items.map((item: any) => ({
      id: item.id,
      type: item.type as 'material' | 'folder',
      original_id: item.original_id,
      original_path: item.original_path,
      original_name: item.original_name,
      trash_name: item.trash_name,
      deleted_by: item.deleted_by,
      deleted_date: item.deleted_date,
      original_folder_path: item.original_folder_path || '',
    }));
  } catch (err) {
    error(MODULE_NAME, 'getTrashItemsエラー:', err);
    return [];
  }
}

/**
 * ゴミ箱に移動
 */
export async function moveToTrash(
  type: 'material' | 'folder',
  originalId: string,
  originalPath: string,
  originalName: string,
  deletedBy: string,
  originalFolderPath?: string
): Promise<TrashItem | null> {
  try {
    await ensureTrashDir();

    // 連番付きの名前を生成
    const isFolder = type === 'folder';
    const uniqueName = await generateUniqueName(originalName, isFolder);

    // ゴミ箱IDを生成
    const trashId = `trash_${Date.now()}`;
    const trashItemDir = path.join(TRASH_DIR, `${type}_${trashId}`);

    // 元のファイル/フォルダの存在確認
    let fileExists = false;
    let isDirectory = false;
    try {
      const stats = await fs.stat(originalPath);
      fileExists = true;
      isDirectory = stats.isDirectory();
    } catch (statErr: any) {
      if (statErr.code === 'ENOENT') {
        // ファイル/フォルダが存在しない場合
        debug(MODULE_NAME, `元のファイル/フォルダが存在しません（既に削除済みの可能性）: ${originalPath}`);
        fileExists = false;
      } else {
        // その他のエラー
        error(MODULE_NAME, 'ファイル/フォルダの存在確認に失敗:', statErr);
        throw statErr;
      }
    }

    // ファイル/フォルダが存在する場合のみコピー
    if (fileExists) {
      try {
        await fs.mkdir(trashItemDir, { recursive: true });
        
        if (isDirectory) {
          await copyDirectory(originalPath, trashItemDir);
        } else {
          // ファイルの場合は親ディレクトリごとコピー
          await copyDirectory(path.dirname(originalPath), trashItemDir);
        }
        debug(MODULE_NAME, `ゴミ箱へのコピー完了: ${originalPath} -> ${trashItemDir}`);
      } catch (copyErr) {
        error(MODULE_NAME, 'ゴミ箱へのコピーに失敗:', copyErr);
        // コピーに失敗しても、SQLiteからは削除するため、エラーを投げない
        // ただし、ゴミ箱ディレクトリは削除しておく
        try {
          await fs.rm(trashItemDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          error(MODULE_NAME, 'ゴミ箱のクリーンアップに失敗:', cleanupErr);
        }
        // ファイルが存在しない場合は続行、それ以外はエラー
        if ((copyErr as any).code !== 'ENOENT') {
          throw copyErr;
        }
      }

      // 元のファイル/フォルダを削除（存在する場合のみ）
      try {
        if (isDirectory) {
          await fs.rm(originalPath, { recursive: true, force: true });
        } else {
          await fs.unlink(originalPath);
        }
        debug(MODULE_NAME, `元のファイル/フォルダを削除: ${originalPath}`);
      } catch (deleteErr: any) {
        if (deleteErr.code === 'ENOENT') {
          // 既に削除されている場合は問題なし
          debug(MODULE_NAME, `元のファイル/フォルダは既に削除済み: ${originalPath}`);
        } else {
          error(MODULE_NAME, '元のファイル/フォルダの削除に失敗:', deleteErr);
          // 削除に失敗しても、コピーは成功しているので、エラーを投げない
          // （ゴミ箱には移動できているため）
        }
      }
    } else {
      // ファイルが存在しない場合でも、メタデータだけを保存するためディレクトリを作成
      await fs.mkdir(trashItemDir, { recursive: true });
      debug(MODULE_NAME, `ファイルが存在しないため、メタデータのみ保存: ${trashItemDir}`);
    }

    // ゴミ箱アイテムをCSVに追加
    const trashItem: TrashItem = {
      id: trashId,
      type,
      original_id: originalId,
      original_path: originalPath,
      original_name: originalName,
      trash_name: uniqueName,
      deleted_by: deletedBy,
      deleted_date: new Date().toISOString(),
      original_folder_path: originalFolderPath || '',
    };

    const items = await getTrashItems();
    items.push(trashItem);
    await writeCSV(TRASH_CSV, items);

    info(MODULE_NAME, `ゴミ箱に移動完了: ${trashId}, name=${uniqueName}`);
    return trashItem;
  } catch (err) {
    error(MODULE_NAME, 'moveToTrashエラー:', err);
    return null;
  }
}

/**
 * ディレクトリを再帰的にコピー
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * ゴミ箱から復元
 */
export async function restoreFromTrash(trashId: string): Promise<boolean> {
  try {
    const items = await getTrashItems();
    const item = items.find((i) => i.id === trashId);

    if (!item) {
      error(MODULE_NAME, `ゴミ箱アイテムが見つかりません: ${trashId}`);
      return false;
    }

    const trashItemDir = path.join(TRASH_DIR, `${item.type}_${trashId}`);

    if (!(await fileExists(trashItemDir))) {
      error(MODULE_NAME, `ゴミ箱ディレクトリが見つかりません: ${trashItemDir}`);
      return false;
    }

    // 元のパスに復元
    const originalDir = path.dirname(item.original_path);
    await fs.mkdir(originalDir, { recursive: true });

    // ゴミ箱から元の場所にコピー
    await copyDirectory(trashItemDir, item.original_path);

    // ゴミ箱から削除
    await fs.rm(trashItemDir, { recursive: true, force: true });

    // CSVから削除
    const updatedItems = items.filter((i) => i.id !== trashId);
    await writeCSV(TRASH_CSV, updatedItems);

    info(MODULE_NAME, `復元完了: ${trashId} -> ${item.original_path}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'restoreFromTrashエラー:', err);
    return false;
  }
}

/**
 * ゴミ箱から完全削除
 */
export async function deleteFromTrash(trashId: string): Promise<boolean> {
  try {
    const items = await getTrashItems();
    const item = items.find((i) => i.id === trashId);

    if (!item) {
      error(MODULE_NAME, `ゴミ箱アイテムが見つかりません: ${trashId}`);
      return false;
    }

    const trashItemDir = path.join(TRASH_DIR, `${item.type}_${trashId}`);

    // ゴミ箱ディレクトリを削除
    if (await fileExists(trashItemDir)) {
      await fs.rm(trashItemDir, { recursive: true, force: true });
    }

    // CSVから削除
    const updatedItems = items.filter((i) => i.id !== trashId);
    await writeCSV(TRASH_CSV, updatedItems);

    info(MODULE_NAME, `完全削除完了: ${trashId}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'deleteFromTrashエラー:', err);
    return false;
  }
}

/**
 * ゴミ箱アイテムのパスを取得（ダウンロード用）
 */
export async function getTrashItemPath(trashId: string): Promise<string | null> {
  try {
    const items = await getTrashItems();
    const item = items.find((i) => i.id === trashId);

    if (!item) {
      return null;
    }

    return path.join(TRASH_DIR, `${item.type}_${trashId}`);
  } catch (err) {
    error(MODULE_NAME, 'getTrashItemPathエラー:', err);
    return null;
  }
}

