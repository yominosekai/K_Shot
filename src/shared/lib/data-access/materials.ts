// 共有資料のデータアクセス層（SQLite）

import { readJSON } from '../file-system/json';
import { getDatabase } from '../database/db';
import { DRIVE_CONFIG } from '@/config/drive';
import path from 'path';
import fs from 'fs/promises';
import type { MaterialNormalized, MaterialMetadata, CategoryNormalized, MaterialFilter } from '@/features/materials/types';
import { debug, info, error } from '../logger';
import { getLikeStatuses } from './likes';

const MODULE_NAME = 'materials';

/**
 * ネットワークドライブのパスを取得
 */
export function getDrivePath(): string {
  // 動的にドライブパスを取得
  return DRIVE_CONFIG.DATA_DIR;
}

/**
 * ファイルが存在するかチェック（ネットワークドライブ優先）
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
 * 共有資料一覧を取得（SQLiteから）
 */
export async function getMaterials(filter?: MaterialFilter): Promise<MaterialNormalized[]> {
  try {
    debug(MODULE_NAME, 'getMaterials開始', { filter });

    const db = getDatabase();
    
    // カテゴリ一覧を取得（カテゴリ名を結合するため）
    const categories = await getCategories();
    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.name);
    });

    // SQLクエリを構築
    let query = `
      SELECT 
        m.id, m.uuid, m.title, m.description, m.category_id,
        m.type, m.difficulty, m.estimated_hours, m.tags,
        m.folder_path, m.created_by, m.created_date, m.updated_date,
        m.is_published, m.views, m.likes
      FROM materials m
      WHERE 1=1
    `;
    const params: any[] = [];

    // フィルター条件を追加
    if (filter) {
      // 差分更新：sinceパラメータがある場合は、その時刻以降に更新されたもののみ取得
      if (filter.since) {
        query += ' AND m.updated_date > ?';
        params.push(filter.since);
      }
      if (filter.search) {
        query += ' AND (LOWER(m.title) LIKE ? OR LOWER(m.description) LIKE ?)';
        const searchPattern = `%${filter.search.toLowerCase()}%`;
        params.push(searchPattern, searchPattern);
      }

      if (filter.category_id) {
        query += ' AND m.category_id = ?';
        params.push(filter.category_id);
      }

      if (filter.type) {
        query += ' AND m.type = ?';
        params.push(filter.type);
      }

      if (filter.tags && filter.tags.length > 0) {
        // タグはカンマ区切り文字列なので、LIKEで検索
        const tagConditions = filter.tags.map(() => 'm.tags LIKE ?').join(' OR ');
        query += ` AND (${tagConditions})`;
        filter.tags.forEach(tag => params.push(`%${tag}%`));
      }

      if (filter.created_by) {
        query += ' AND m.created_by = ?';
        params.push(filter.created_by);
      }

      if (filter.folder_path !== undefined) {
        if (filter.folder_path === '') {
          query += ' AND (m.folder_path IS NULL OR m.folder_path = \'\')';
        } else {
          query += ' AND m.folder_path LIKE ?';
          params.push(`${filter.folder_path}%`);
        }
      }

      if (filter.is_published !== undefined) {
        query += ' AND m.is_published = ?';
        params.push(filter.is_published ? 1 : 0);
      }

      // ソート（SQLインジェクション対策：ホワイトリスト検証）
      if (filter.sort_by) {
        // 許可されたカラム名のホワイトリスト
        const allowedSortColumns = ['created_date', 'updated_date', 'title', 'views', 'likes'] as const;
        const isValidSortColumn = allowedSortColumns.includes(filter.sort_by as any);
        
        if (isValidSortColumn) {
          const order = filter.sort_order || 'desc';
          // orderも検証（ASC/DESCのみ許可）
          const validOrder = (order.toLowerCase() === 'asc' || order.toLowerCase() === 'desc') 
            ? order.toUpperCase() 
            : 'DESC';
          
          const sortColumn = filter.sort_by === 'title' ? 'm.title' : `m.${filter.sort_by}`;
          query += ` ORDER BY ${sortColumn} ${validOrder}`;
        } else {
          // 不正な値の場合はデフォルトソートを使用
          debug(MODULE_NAME, `不正なsort_byパラメータ: ${filter.sort_by}、デフォルトソートを使用`);
          query += ' ORDER BY m.updated_date DESC';
        }
      } else {
        query += ' ORDER BY m.updated_date DESC';
      }

      // ページネーション
      if (filter.limit !== undefined) {
        query += ' LIMIT ?';
        params.push(filter.limit);
        if (filter.offset !== undefined) {
          query += ' OFFSET ?';
          params.push(filter.offset);
        }
      }
    } else {
      query += ' ORDER BY m.updated_date DESC';
    }

    // クエリ実行
    const rows = db.prepare(query).all(...params) as any[];

    // 正規化
    const normalized: MaterialNormalized[] = rows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      title: row.title,
      description: row.description || '',
      category_id: row.category_id || '',
      category_name: categoryMap.get(row.category_id || ''),
      type: row.type as MaterialNormalized['type'],
      difficulty: row.difficulty || undefined,
      estimated_hours: row.estimated_hours !== null ? row.estimated_hours : undefined,
      tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
      folder_path: row.folder_path || '',
      created_by: row.created_by,
      created_date: row.created_date,
      updated_date: row.updated_date,
      is_published: row.is_published === 1,
      views: row.views || 0,
      likes: row.likes || 0,
    }));


    // いいね状態を一括取得（user_idが指定されている場合）
    if (normalized.length > 0 && filter?.user_id) {
      try {
        const materialIds = normalized.map(m => m.id);
        const likeStatuses = getLikeStatuses(materialIds, filter.user_id);
        
        // いいね状態を追加
        normalized.forEach(material => {
          material.is_liked = likeStatuses.has(material.id);
        });
        
        debug(MODULE_NAME, `いいね状態一括取得完了: ${normalized.length}件`);
      } catch (err) {
        error(MODULE_NAME, 'いいね状態一括取得エラー:', err);
        // エラーが発生しても続行（is_likedはfalseのまま）
      }
    }

    // コメント数を一括取得
    if (normalized.length > 0) {
      try {
        const { getMaterialCommentCounts } = await import('./comments');
        const materialIds = normalized.map(m => m.id);
        const commentCounts = getMaterialCommentCounts(materialIds);
        
        // コメント数を追加
        normalized.forEach(material => {
          material.comment_count = commentCounts.get(material.id) || 0;
        });
        
        debug(MODULE_NAME, `コメント数一括取得完了: ${normalized.length}件`);
      } catch (err) {
        error(MODULE_NAME, 'コメント数一括取得エラー:', err);
        // エラーが発生しても続行（コメント数は0のまま）
      }
    }

    debug(MODULE_NAME, `getMaterials完了: ${normalized.length}件`);
    return normalized;
  } catch (err) {
    error(MODULE_NAME, 'getMaterialsエラー:', err);
    return [];
  }
}

/**
 * 資料の詳細を取得（SQLite + metadata.json + document.md）
 */
export async function getMaterialDetail(materialId: string): Promise<MaterialNormalized | null> {
  try {
    debug(MODULE_NAME, `getMaterialDetail開始: materialId=${materialId}`);

    const db = getDatabase();
    const drivePath = getDrivePath();

    // SQLiteから基本情報を取得
    const materialRow = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any;
    
    if (!materialRow) {
      error(MODULE_NAME, `getMaterialDetail: 資料が見つかりません (materialId=${materialId})`);
      return null;
    }

    const folderPath = materialRow.folder_path || '';

    // フォルダパスに基づいてmaterial_{id}フォルダのパスを構築
    let materialDir: string;
    if (folderPath && folderPath.trim() !== '') {
      const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
    } else {
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    const metadataPath = path.join(drivePath, materialDir, 'metadata.json');
    const documentPath = path.join(drivePath, materialDir, 'document.md');

    // メタデータを読み込み（metadata.jsonが存在する場合）
    let metadata: MaterialMetadata | null = null;
    if (await fileExists(metadataPath)) {
      metadata = await readJSON(metadataPath);
    }

    // document.mdを読み込み
    let document = '';
    if (await fileExists(documentPath)) {
      document = await fs.readFile(documentPath, 'utf-8');
    }

    // カテゴリ一覧を取得（カテゴリ名を結合するため）
    const categories = await getCategories();
    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.name);
    });

    // 正規化（folder_pathはSQLiteを優先、その他はmetadata.jsonを優先）
    // folder_pathはフォルダ名変更・移動時にSQLiteが常に最新の状態を保持するため、SQLiteを信頼する
    const normalized: MaterialNormalized = {
      id: materialRow.id,
      uuid: materialRow.uuid,
      title: metadata?.title || materialRow.title,
      description: metadata?.description || materialRow.description || '',
      category_id: metadata?.category_id || materialRow.category_id || '',
      category_name: categoryMap.get(metadata?.category_id || materialRow.category_id || ''),
      type: (metadata?.type || materialRow.type) as MaterialNormalized['type'],
      difficulty: metadata?.difficulty || materialRow.difficulty || undefined,
      estimated_hours: metadata?.estimated_hours 
        ? parseFloat(metadata.estimated_hours.toString()) 
        : (materialRow.estimated_hours !== null ? materialRow.estimated_hours : undefined),
      tags: metadata?.tags || (materialRow.tags ? materialRow.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : []),
      folder_path: folderPath || '', // SQLiteのfolder_pathを優先（常に最新の状態）
      created_by: metadata?.created_by || materialRow.created_by,
      created_date: metadata?.created_date || materialRow.created_date,
      updated_date: metadata?.updated_date || materialRow.updated_date,
      is_published: metadata?.is_published !== undefined ? metadata.is_published : (materialRow.is_published === 1),
      views: metadata?.views || materialRow.views || 0,
      likes: metadata?.likes || materialRow.likes || 0,
      document,
      attachments: metadata?.attachments || [],
    };

    debug(MODULE_NAME, `getMaterialDetail完了: materialId=${materialId}`);
    return normalized;
  } catch (err) {
    error(MODULE_NAME, `getMaterialDetailエラー: materialId=${materialId}`, err);
    return null;
  }
}

// カテゴリキャッシュ（サーバー側メモリキャッシュ、変動チェック方式）
const categoryCache: {
  data: CategoryNormalized[] | null;
  lastCheckedTimestamp: string | null; // 最後に取得した時刻（MAX(created_date)）
} = {
  data: null,
  lastCheckedTimestamp: null,
};

/**
 * カテゴリ一覧を取得（SQLiteから、変動チェック方式のキャッシュ付き）
 */
export async function getCategories(): Promise<CategoryNormalized[]> {
  try {
    debug(MODULE_NAME, 'getCategories開始');

    const db = getDatabase();
    
    // 変動チェック: MAX(created_date)を取得（軽量クエリ）
    const maxCreatedDate = db
      .prepare('SELECT MAX(created_date) as max_date FROM categories')
      .get() as { max_date: string | null } | undefined;
    
    const latestCreatedDate = maxCreatedDate?.max_date || null;

    // キャッシュが存在し、変動がない場合
    if (categoryCache.data && categoryCache.lastCheckedTimestamp === latestCreatedDate) {
      debug(MODULE_NAME, `getCategories: キャッシュを返します（変動なし）`);
      return categoryCache.data; // キャッシュを返す（DBアクセスなし）
    }

    // 変動がある場合、またはキャッシュがない場合
    debug(MODULE_NAME, `getCategories: キャッシュを更新します（変動ありまたはキャッシュなし）`);
    const rows = db.prepare('SELECT * FROM categories ORDER BY level, name').all() as any[];

    // 正規化
    const normalized: CategoryNormalized[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      parent_id: row.parent_id || '',
      level: row.level || 0,
      created_date: row.created_date,
    }));

    // キャッシュを更新
    categoryCache.data = normalized;
    categoryCache.lastCheckedTimestamp = latestCreatedDate;

    debug(MODULE_NAME, `getCategories完了: ${normalized.length}件（キャッシュ更新）`);
    return normalized;
  } catch (err) {
    // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return [];
    }
    error(MODULE_NAME, 'getCategoriesエラー:', err);
    return [];
  }
}

