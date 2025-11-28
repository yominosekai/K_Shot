// フォルダ管理のデータアクセス層（SQLite）

import { getDatabase } from '../database/db';
import { DRIVE_CONFIG } from '@/config/drive';
import fs from 'fs/promises';
import path from 'path';
import type Database from 'better-sqlite3';
import type { FolderNormalized } from '@/features/materials/types';
import { debug, error } from '../logger';
import {
  sanitizeFolderName,
  buildFolderPath,
  resolveFolderPhysicalPath,
  normalizeFolderRow,
  type FolderRow,
} from './folder-helpers';

const MODULE_NAME = 'folders';

function fetchFolderById(db: Database.Database, folderId: string): FolderRow | null {
  const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId) as FolderRow | undefined;
  return row ?? null;
}

/**
 * ネットワークドライブのパスを取得
 */
function getDrivePath(): string {
  // 動的にドライブパスを取得
  return DRIVE_CONFIG.DATA_DIR;
}

// フォルダキャッシュ（サーバー側メモリキャッシュ、変動チェック方式）
const folderCache: {
  data: FolderNormalized[] | null;
  lastCheckedTimestamp: string | null; // 最後に取得した時刻（MAX(created_date)）
} = {
  data: null,
  lastCheckedTimestamp: null,
};

/**
 * フォルダ一覧を取得（SQLiteから、階層構造、変動チェック方式のキャッシュ付き）
 */
export async function getFolders(): Promise<FolderNormalized[]> {
  try {
    debug(MODULE_NAME, 'getFolders開始');

    const db = getDatabase();
    
    // 変動チェック: MAX(created_date)を取得（軽量クエリ）
    const maxCreatedDate = db
      .prepare('SELECT MAX(created_date) as max_date FROM folders')
      .get() as { max_date: string | null } | undefined;
    
    const latestCreatedDate = maxCreatedDate?.max_date || null;

    // キャッシュが存在し、変動がない場合
    if (folderCache.data && folderCache.lastCheckedTimestamp === latestCreatedDate) {
      debug(MODULE_NAME, `getFolders: キャッシュを返します（変動なし）`);
      return folderCache.data; // キャッシュを返す（DBアクセスなし）
    }

    // 変動がある場合、またはキャッシュがない場合
    debug(MODULE_NAME, `getFolders: キャッシュを更新します（変動ありまたはキャッシュなし）`);
    const rows = db.prepare('SELECT * FROM folders ORDER BY path').all() as FolderRow[];

    const normalized: FolderNormalized[] = rows.map((row) => normalizeFolderRow(row));

    // 階層構造を構築
    const folderMap = new Map<string, FolderNormalized>();
    normalized.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    const rootFolders: FolderNormalized[] = [];
    normalized.forEach((folder) => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (!folder.parent_id || folder.parent_id === '') {
        rootFolders.push(folderWithChildren);
      } else {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(folderWithChildren);
        }
      }
    });

    // キャッシュを更新
    folderCache.data = rootFolders;
    folderCache.lastCheckedTimestamp = latestCreatedDate;

    debug(MODULE_NAME, `getFolders完了: ${normalized.length}件（キャッシュ更新）`);
    return rootFolders;
  } catch (err) {
    error(MODULE_NAME, 'getFoldersエラー:', err);
    return [];
  }
}

/**
 * フラットなフォルダ一覧を取得（階層構造なし、SQLiteから）
 */
export async function getFoldersFlat(): Promise<FolderNormalized[]> {
  try {
    debug(MODULE_NAME, 'getFoldersFlat開始');

    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM folders ORDER BY path').all() as FolderRow[];

    const normalized: FolderNormalized[] = rows.map((row) => normalizeFolderRow(row));

    debug(MODULE_NAME, `getFoldersFlat完了: ${normalized.length}件`);
    return normalized;
  } catch (err) {
    // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return [];
    }
    error(MODULE_NAME, 'getFoldersFlatエラー:', err);
    return [];
  }
}

/**
 * フォルダを作成
 */
export async function createFolder(
  name: string,
  parentId: string,
  createdBy: string
): Promise<FolderNormalized | null> {
  try {
    debug(MODULE_NAME, `createFolder開始: name=${name}, parentId=${parentId}`);

    const sanitizedName = sanitizeFolderName(name.trim());
    
    // サニタイズ後の名前が空の場合はエラー
    if (!sanitizedName || sanitizedName.length === 0) {
      error(MODULE_NAME, `フォルダ名が無効です: 元の名前="${name}"`);
      return null;
    }

    const db = getDatabase();
    const drivePath = getDrivePath();

    const parent = parentId ? fetchFolderById(db, parentId) : null;
    const folderPath = buildFolderPath(parent?.path, sanitizedName);

    // 新しいフォルダIDを生成
    const folderId = `folder_${Date.now()}`;
    const createdDate = new Date().toISOString();

    // SQLiteに保存（サニタイズ後の名前を使用）
    const insert = db.prepare(`
      INSERT INTO folders (id, name, parent_id, path, created_by, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(folderId, sanitizedName, parentId || '', folderPath, createdBy, createdDate);

    // 物理的なディレクトリを作成（常にネットワークドライブに作成）
    const folderDir = resolveFolderPhysicalPath(drivePath, folderPath);
    await fs.mkdir(folderDir, { recursive: true });

    debug(MODULE_NAME, `createFolder完了: folderId=${folderId}, path=${folderPath}, 元の名前="${name}", サニタイズ後の名前="${sanitizedName}"`);
    return {
      id: folderId,
      name: sanitizedName, // サニタイズ後の名前を返す
      parent_id: parentId || '',
      path: folderPath,
      created_by: createdBy,
      created_date: createdDate,
    };
  } catch (err) {
    error(MODULE_NAME, 'createFolderエラー:', err);
    throw err;
  }
}

/**
 * パスからフォルダIDを取得
 */
export async function getFolderIdByPath(folderPath: string): Promise<string | null> {
  try {
    const folders = await getFoldersFlat();
    const folder = folders.find((f) => f.path === folderPath);
    return folder ? folder.id : null;
  } catch (err) {
    error(MODULE_NAME, 'getFolderIdByPathエラー:', err);
    return null;
  }
}

/**
 * フォルダ名を変更
 */
export async function updateFolderName(
  folderId: string,
  newName: string
): Promise<FolderNormalized | null> {
  try {
    debug(MODULE_NAME, `updateFolderName開始: folderId=${folderId}, newName=${newName}`);

    const db = getDatabase();
    const drivePath = getDrivePath();

    const folder = fetchFolderById(db, folderId);
    if (!folder) {
      error(MODULE_NAME, `フォルダが見つかりません: folderId=${folderId}`);
      return null;
    }

    // フォルダ名をサニタイズ
    const sanitizedName = sanitizeFolderName(newName.trim());
    if (!sanitizedName || sanitizedName.length === 0) {
      error(MODULE_NAME, `フォルダ名が無効です: 元の名前="${newName}"`);
      return null;
    }

    // 同じ名前の場合は何もしない
    if (folder.name === sanitizedName) {
      debug(MODULE_NAME, `フォルダ名が同じです: ${sanitizedName}`);
      return {
        id: folder.id,
        name: folder.name,
        parent_id: folder.parent_id || '',
        path: folder.path || '',
        created_by: folder.created_by,
        created_date: folder.created_date,
      };
    }

    const parent = folder.parent_id ? fetchFolderById(db, folder.parent_id) : null;
    const newPath = buildFolderPath(parent?.path, sanitizedName);

    const oldPath = folder.path || '';
    const oldName = folder.name;

    const oldDir = resolveFolderPhysicalPath(drivePath, oldPath);
    const newDir = resolveFolderPhysicalPath(drivePath, newPath);

    // 移動先に既に同じ名前のフォルダがある場合はエラー
    try {
      await fs.access(newDir);
      error(MODULE_NAME, `移動先に既にフォルダが存在します: ${newDir}`);
      return null;
    } catch {
      // 存在しない場合は問題なし
    }

    // 物理ディレクトリをリネーム
    try {
      await fs.rename(oldDir, newDir);
      debug(MODULE_NAME, `フォルダディレクトリをリネーム: ${oldDir} -> ${newDir}`);
    } catch (err) {
      error(MODULE_NAME, 'フォルダディレクトリのリネームエラー:', err);
      return null;
    }

    await updateChildFolderPaths(db, drivePath, folder.id, oldPath, newPath);

    // このフォルダ内の資料のfolder_pathを更新
    // SQLiteのfolder_pathを更新するだけで十分（getMaterialDetailはSQLiteを優先するため）
    const materials = db.prepare('SELECT * FROM materials WHERE folder_path = ?').all(oldPath) as any[];
    const now = new Date().toISOString();
    for (const material of materials) {
      db.prepare('UPDATE materials SET folder_path = ?, updated_date = ? WHERE id = ?').run(
        newPath,
        now,
        material.id
      );
    }

    // SQLiteのフォルダ情報を更新
    db.prepare('UPDATE folders SET name = ?, path = ? WHERE id = ?').run(
      sanitizedName,
      newPath,
      folderId
    );

    debug(MODULE_NAME, `updateFolderName完了: folderId=${folderId}, 旧名="${oldName}" -> 新名="${sanitizedName}", 旧パス="${oldPath}" -> 新パス="${newPath}"`);

    return {
      id: folder.id,
      name: sanitizedName,
      parent_id: folder.parent_id || '',
      path: newPath,
      created_by: folder.created_by,
      created_date: folder.created_date,
    };
  } catch (err) {
    error(MODULE_NAME, 'updateFolderNameエラー:', err);
    return null;
  }
}

/**
 * フォルダを移動
 */
export async function moveFolder(
  folderId: string,
  targetParentId: string
): Promise<FolderNormalized | null> {
  try {
    debug(MODULE_NAME, `moveFolder開始: folderId=${folderId}, targetParentId=${targetParentId}`);

    const db = getDatabase();
    const drivePath = getDrivePath();

    const folder = fetchFolderById(db, folderId);
    if (!folder) {
      error(MODULE_NAME, `フォルダが見つかりません: folderId=${folderId}`);
      return null;
    }

    // 自分自身を親にすることはできない
    if (targetParentId === folderId) {
      error(MODULE_NAME, `自分自身を親にすることはできません: folderId=${folderId}`);
      return null;
    }

    // 移動先の親フォルダが自分の子孫でないことを確認
    const checkDescendant = (parentId: string): boolean => {
      if (parentId === folderId) return true;
      const children = db.prepare('SELECT * FROM folders WHERE parent_id = ?').all(parentId) as any[];
      for (const child of children) {
        if (checkDescendant(child.id)) return true;
      }
      return false;
    };
    if (targetParentId && checkDescendant(targetParentId)) {
      error(MODULE_NAME, `自分の子孫フォルダに移動することはできません: folderId=${folderId}`);
      return null;
    }

    // 既に同じ親の場合は何もしない
    const currentParentId = folder.parent_id || '';
    if (currentParentId === targetParentId) {
      debug(MODULE_NAME, `既に同じ親フォルダにあります: folderId=${folderId}`);
      return {
        id: folder.id,
        name: folder.name,
        parent_id: folder.parent_id || '',
        path: folder.path || '',
        created_by: folder.created_by,
        created_date: folder.created_date,
      };
    }

    const targetParent = targetParentId ? fetchFolderById(db, targetParentId) : null;
    const newPath = buildFolderPath(targetParent?.path, folder.name);

    const oldPath = folder.path || '';

    // 物理ディレクトリのパス
    const oldDir = resolveFolderPhysicalPath(drivePath, oldPath);
    const newDir = resolveFolderPhysicalPath(drivePath, newPath);

    // 移動先に既に同じ名前のフォルダがある場合はエラー
    try {
      await fs.access(newDir);
      error(MODULE_NAME, `移動先に既にフォルダが存在します: ${newDir}`);
      return null;
    } catch {
      // 存在しない場合は問題なし
    }

    // 移動先の親ディレクトリを作成（存在しない場合）
    const targetParentDir = path.dirname(newDir);
    await fs.mkdir(targetParentDir, { recursive: true });

    // 物理ディレクトリを移動
    try {
      await fs.rename(oldDir, newDir);
      debug(MODULE_NAME, `フォルダディレクトリを移動: ${oldDir} -> ${newDir}`);
    } catch (err) {
      error(MODULE_NAME, 'フォルダディレクトリの移動エラー:', err);
      return null;
    }

    await updateChildFolderPaths(db, drivePath, folder.id, oldPath, newPath);

    // このフォルダ内の資料のfolder_pathを更新
    // SQLiteのfolder_pathを更新するだけで十分（getMaterialDetailはSQLiteを優先するため）
    const materials = db.prepare('SELECT * FROM materials WHERE folder_path = ?').all(oldPath) as any[];
    const now = new Date().toISOString();
    for (const material of materials) {
      db.prepare('UPDATE materials SET folder_path = ?, updated_date = ? WHERE id = ?').run(
        newPath,
        now,
        material.id
      );
    }

    // SQLiteのフォルダ情報を更新
    db.prepare('UPDATE folders SET parent_id = ?, path = ? WHERE id = ?').run(
      targetParentId || '',
      newPath,
      folderId
    );

    debug(MODULE_NAME, `moveFolder完了: folderId=${folderId}, 旧パス="${oldPath}" -> 新パス="${newPath}"`);

    return {
      id: folder.id,
      name: folder.name,
      parent_id: targetParentId || '',
      path: newPath,
      created_by: folder.created_by,
      created_date: folder.created_date,
    };
  } catch (err) {
    error(MODULE_NAME, 'moveFolderエラー:', err);
    return null;
  }
}

async function updateChildFolderPaths(
  db: Database.Database,
  drivePath: string,
  parentFolderId: string,
  oldParentPath: string,
  newParentPath: string
): Promise<void> {
  const children = db
    .prepare('SELECT * FROM folders WHERE parent_id = ?')
    .all(parentFolderId) as FolderRow[];

  for (const child of children) {
    const childOldPath = child.path || '';
    const childNewPath = buildChildPath(childOldPath, oldParentPath, newParentPath);
    db.prepare('UPDATE folders SET path = ? WHERE id = ?').run(childNewPath, child.id);

    const childOldDir = resolveFolderPhysicalPath(drivePath, childOldPath);
    const childNewDir = resolveFolderPhysicalPath(drivePath, childNewPath);
    try {
      await fs.rename(childOldDir, childNewDir);
      debug(MODULE_NAME, `子フォルダ移動: ${childOldDir} -> ${childNewDir}`);
    } catch (err) {
      error(MODULE_NAME, `子フォルダ移動エラー: ${childOldDir}`, err);
    }

    await updateChildFolderPaths(db, drivePath, child.id, childOldPath, childNewPath);
  }
}

function buildChildPath(childOldPath: string, oldParentPath: string, newParentPath: string): string {
  const parentPrefix = oldParentPath ? `${oldParentPath}/` : '';
  let relative = childOldPath;
  if (parentPrefix && childOldPath.startsWith(parentPrefix)) {
    relative = childOldPath.slice(parentPrefix.length);
  }
  const normalizedRelative = relative.replace(/^\/+/, '');
  if (!newParentPath) {
    return normalizedRelative;
  }
  return normalizedRelative ? `${newParentPath}/${normalizedRelative}` : newParentPath;
}
