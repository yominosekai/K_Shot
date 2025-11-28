import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/db';
import { info, error, debug } from '../logger';
import type { MaterialRevision } from '@/features/materials/types';

const MODULE_NAME = 'material-revisions';

export interface AddMaterialRevisionParams {
  materialId: string;
  updatedBy: string;
  updatedByName?: string | null;
  comment?: string | null;
}

export async function addMaterialRevision({
  materialId,
  updatedBy,
  updatedByName,
  comment,
}: AddMaterialRevisionParams): Promise<MaterialRevision | null> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db
      .prepare('SELECT MAX(version) as maxVersion FROM material_revisions WHERE material_id = ?')
      .get(materialId) as { maxVersion?: number } | undefined;

    const nextVersion = (result?.maxVersion || 0) + 1;
    const id = uuidv4();

    db.prepare(
      `
      INSERT INTO material_revisions (
        id, material_id, version, updated_by, updated_by_name, comment, updated_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, materialId, nextVersion, updatedBy, updatedByName || null, comment || null, now);

    const revision: MaterialRevision = {
      id,
      material_id: materialId,
      version: nextVersion,
      updated_by: updatedBy,
      updated_by_name: updatedByName || undefined,
      comment: comment || undefined,
      updated_date: now,
    };

    debug(MODULE_NAME, `資料更新履歴を追加: materialId=${materialId}, version=${nextVersion}`);
    return revision;
  } catch (err) {
    error(MODULE_NAME, '資料更新履歴の追加に失敗しました', err);
    return null;
  }
}

export async function getMaterialRevisions(
  materialId: string,
  limit = 10
): Promise<MaterialRevision[]> {
  try {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT id, material_id, version, updated_by, updated_by_name, comment, updated_date
        FROM material_revisions
        WHERE material_id = ?
        ORDER BY version DESC
        LIMIT ?
      `
      )
      .all(materialId, limit) as Array<{
        id: string;
        material_id: string;
        version: number;
        updated_by: string;
        updated_by_name?: string | null;
        comment?: string | null;
        updated_date: string;
      }>;

    return rows.map((row) => ({
      id: row.id,
      material_id: row.material_id,
      version: row.version,
      updated_by: row.updated_by,
      updated_by_name: row.updated_by_name || undefined,
      comment: row.comment || undefined,
      updated_date: row.updated_date,
    }));
  } catch (err) {
    error(MODULE_NAME, '資料更新履歴の取得に失敗しました', err);
    return [];
  }
}


