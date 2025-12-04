import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { getDatabase } from '../database/db';
import { getDrivePath } from './materials';
import { readJSON, writeJSON } from '../file-system/json';
import { info, error, debug } from '../logger';
import type { MaterialRevision } from '@/features/materials/types';

const MODULE_NAME = 'material-revisions';

export interface AddMaterialRevisionParams {
  materialId: string;
  updatedBy: string;
  updatedByName?: string | null;
  comment?: string | null;
  metadataPath?: string; // metadata.jsonのパス（オプション、指定されない場合は自動計算）
}

/**
 * metadata.jsonのパスを取得
 */
function getMetadataPath(materialId: string): string {
  const db = getDatabase();
  const drivePath = getDrivePath();
  
  // SQLiteからfolder_pathを取得
  const materialRow = db.prepare('SELECT folder_path FROM materials WHERE id = ?').get(materialId) as { folder_path?: string } | undefined;
  const folderPath = materialRow?.folder_path || '';
  
  // フォルダパスに基づいてmaterial_{id}フォルダのパスを構築
  let materialDir: string;
  if (folderPath && folderPath.trim() !== '') {
    const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
    materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
  } else {
    materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
  }
  
  return path.join(drivePath, materialDir, 'metadata.json');
}

export async function addMaterialRevision({
  materialId,
  updatedBy,
  updatedByName,
  comment,
  metadataPath,
}: AddMaterialRevisionParams): Promise<MaterialRevision | null> {
  debug(MODULE_NAME, `[履歴追加開始] materialId=${materialId}, updatedBy=${updatedBy}, updatedByName=${updatedByName || 'null'}, comment=${comment || 'null'}`);
  
  try {
    // metadata.jsonのパスを取得
    const jsonPath = metadataPath || getMetadataPath(materialId);
    debug(MODULE_NAME, `[metadata.jsonパス] ${jsonPath}`);
    
    // 既存のmetadata.jsonを読み込み
    let metadata: any = {};
    try {
      const existingMetadata = await readJSON(jsonPath);
      if (existingMetadata) {
        metadata = existingMetadata;
      }
    } catch (err) {
      debug(MODULE_NAME, `[metadata.json読み込み] ファイルが存在しないか読み込みエラー: ${err}`);
      // ファイルが存在しない場合は新規作成として扱う
    }
    
    // 既存の履歴を取得
    const existingRevisions: MaterialRevision[] = metadata.revisions || [];
    const maxVersion = existingRevisions.length > 0 
      ? Math.max(...existingRevisions.map(r => r.version))
      : 0;
    const nextVersion = maxVersion + 1;
    
    const now = new Date().toISOString();
    const id = uuidv4();
    
    debug(MODULE_NAME, `[バージョン計算完了] materialId=${materialId}, nextVersion=${nextVersion}, id=${id}`);
    
    // 新しい履歴を作成
    const newRevision: MaterialRevision = {
      id,
      material_id: materialId,
      version: nextVersion,
      updated_by: updatedBy,
      updated_by_name: updatedByName || undefined,
      comment: comment || undefined,
      updated_date: now,
    };
    
    // 履歴を配列の先頭に追加（新しいものが上に来る）
    const updatedRevisions = [newRevision, ...existingRevisions];
    metadata.revisions = updatedRevisions;
    
    // metadata.jsonを保存
    await writeJSON(jsonPath, metadata);
    debug(MODULE_NAME, `[履歴追加成功] materialId=${materialId}, version=${nextVersion}, metadata.json更新完了`);
    
    return newRevision;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    error(MODULE_NAME, '資料更新履歴の追加に失敗しました', err);
    error(MODULE_NAME, `[エラー詳細] materialId=${materialId}, errorMessage=${errorMessage}`);
    if (errorStack) {
      error(MODULE_NAME, `[エラースタック] ${errorStack}`);
    }
    
    return null;
  }
}

export async function getMaterialRevisions(
  materialId: string,
  limit = 10
): Promise<MaterialRevision[]> {
  try {
    // metadata.jsonのパスを取得
    const jsonPath = getMetadataPath(materialId);
    
    // metadata.jsonを読み込み
    const metadata = await readJSON(jsonPath);
    if (!metadata || !metadata.revisions || !Array.isArray(metadata.revisions)) {
      debug(MODULE_NAME, `[履歴取得] 履歴が存在しません: materialId=${materialId}`);
      return [];
    }
    
    // 履歴を取得（既に新しい順に並んでいる想定）
    const revisions: MaterialRevision[] = metadata.revisions
      .slice(0, limit)
      .map((r: any) => ({
        id: r.id || uuidv4(),
        material_id: r.material_id || materialId,
        version: r.version,
        updated_by: r.updated_by,
        updated_by_name: r.updated_by_name || undefined,
        comment: r.comment || undefined,
        updated_date: r.updated_date,
      }));
    
    debug(MODULE_NAME, `[履歴取得成功] materialId=${materialId}, ${revisions.length}件`);
    return revisions;
  } catch (err) {
    error(MODULE_NAME, '資料更新履歴の取得に失敗しました', err);
    return [];
  }
}


