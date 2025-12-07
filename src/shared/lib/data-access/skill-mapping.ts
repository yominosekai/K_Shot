// スキルマッピングデータアクセス層

import { getDatabase } from '../database/db';
import { readJSON, writeJSON } from '../file-system/json';
import { getUserSubPath } from '../file-system/user-storage';
import { info, error, debug } from '../logger';
import fs from 'fs';
import path from 'path';

const MODULE_NAME = 'skill-mapping';

// スキルフェーズ項目の型定義
export interface SkillPhaseItem {
  id: number;
  category: string;
  item: string;
  subCategory: string;
  smallCategory: string;
  phase: number;
  name: string;
  description?: string;
  displayOrder?: number | null;
}

// 進捗状態の型定義
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

// 進捗データの型定義
export interface SkillProgress {
  skillPhaseItemId: number;
  status: ProgressStatus;
  completedDate?: string;
  notes?: string;
}

// 進捗ファイルの型定義
interface SkillProgressFile {
  progress: SkillProgress[];
  updatedAt: string;
}

const PROGRESS_FILE_NAME = 'skill_progress.json';

/**
 * スキルマスタ一覧を取得
 */
export function getSkillPhaseItems(): SkillPhaseItem[] {
  try {
    const db = getDatabase();
    const items = db
      .prepare(
        `
      SELECT 
        id,
        category,
        item,
        sub_category as subCategory,
        small_category as smallCategory,
        phase,
        name,
        description,
        display_order as displayOrder
      FROM skill_phase_items
      ORDER BY 
        COALESCE(display_order, 999999),
        category,
        item,
        sub_category,
        phase,
        small_category
    `
      )
      .all() as SkillPhaseItem[];

    debug(MODULE_NAME, `スキルマスタ取得: ${items.length}件`);
    return items;
  } catch (err) {
    error(MODULE_NAME, 'スキルマスタ取得エラー:', err);
    return [];
  }
}

/**
 * 特定のスキルフェーズ項目を取得
 */
export function getSkillPhaseItem(id: number): SkillPhaseItem | null {
  try {
    const db = getDatabase();
    const item = db
      .prepare(
        `
      SELECT 
        id,
        category,
        item,
        sub_category as subCategory,
        small_category as smallCategory,
        phase,
        name,
        description,
        display_order as displayOrder
      FROM skill_phase_items
      WHERE id = ?
    `
      )
      .get(id) as SkillPhaseItem | undefined;

    return item || null;
  } catch (err) {
    error(MODULE_NAME, `スキルフェーズ項目取得エラー: id=${id}`, err);
    return null;
  }
}

/**
 * スキルフェーズ項目を追加
 */
export function createSkillPhaseItem(
  category: string,
  item: string,
  subCategory: string,
  smallCategory: string,
  phase: number,
  name: string,
  description?: string,
  displayOrder?: number | null
): SkillPhaseItem | null {
  try {
    const db = getDatabase();
    const result = db
      .prepare(
        `
      INSERT INTO skill_phase_items (
        category,
        item,
        sub_category,
        small_category,
        phase,
        name,
        description,
        display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(category, item, subCategory, smallCategory, phase, name, description || null, displayOrder || null);

    const newId = result.lastInsertRowid as number;
    const newItem = getSkillPhaseItem(newId);

    info(MODULE_NAME, `スキルフェーズ項目追加: id=${newId}, name=${name}`);
    return newItem;
  } catch (err) {
    error(MODULE_NAME, 'スキルフェーズ項目追加エラー:', err);
    return null;
  }
}

/**
 * スキルフェーズ項目を更新
 */
export function updateSkillPhaseItem(
  id: number,
  category: string,
  item: string,
  subCategory: string,
  smallCategory: string,
  phase: number,
  name: string,
  description?: string,
  displayOrder?: number | null
): boolean {
  try {
    const db = getDatabase();
    db.prepare(
      `
      UPDATE skill_phase_items
      SET
        category = ?,
        item = ?,
        sub_category = ?,
        small_category = ?,
        phase = ?,
        name = ?,
        description = ?,
        display_order = ?
      WHERE id = ?
    `
    ).run(category, item, subCategory, smallCategory, phase, name, description || null, displayOrder || null, id);

    info(MODULE_NAME, `スキルフェーズ項目更新: id=${id}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, `スキルフェーズ項目更新エラー: id=${id}`, err);
    return false;
  }
}

/**
 * スキルフェーズ項目を削除
 */
export function deleteSkillPhaseItem(id: number): boolean {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM skill_phase_items WHERE id = ?').run(id);

    info(MODULE_NAME, `スキルフェーズ項目削除: id=${id}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, `スキルフェーズ項目削除エラー: id=${id}`, err);
    return false;
  }
}

/**
 * 進捗ファイルのパスを取得
 */
function getProgressFilePath(userId: string): string {
  return getUserSubPath(userId, PROGRESS_FILE_NAME);
}

/**
 * 進捗データを読み込む
 */
async function readProgressData(userId: string): Promise<SkillProgressFile> {
  const filePath = getProgressFilePath(userId);
  const data = (await readJSON(filePath)) as SkillProgressFile | null;

  if (data && Array.isArray(data.progress)) {
    return data;
  }

  // ファイルが存在しない、または形式が不正な場合は空のデータを返す
  return {
    progress: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 進捗データを保存
 */
async function writeProgressData(userId: string, progressFile: SkillProgressFile): Promise<void> {
  const filePath = getProgressFilePath(userId);
  const dir = path.dirname(filePath);

  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await writeJSON(filePath, progressFile);
}

/**
 * ユーザーの進捗データを取得
 */
export async function getUserProgress(userId: string): Promise<SkillProgress[]> {
  try {
    const progressFile = await readProgressData(userId);
    debug(MODULE_NAME, `進捗データ取得: userId=${userId}, ${progressFile.progress.length}件`);
    return progressFile.progress;
  } catch (err) {
    error(MODULE_NAME, `進捗データ取得エラー: userId=${userId}`, err);
    return [];
  }
}

/**
 * 特定のスキルフェーズ項目の進捗を取得
 */
export async function getSkillProgress(
  userId: string,
  skillPhaseItemId: number
): Promise<SkillProgress | null> {
  try {
    const progress = await getUserProgress(userId);
    return progress.find((p) => p.skillPhaseItemId === skillPhaseItemId) || null;
  } catch (err) {
    error(MODULE_NAME, `進捗取得エラー: userId=${userId}, itemId=${skillPhaseItemId}`, err);
    return null;
  }
}

/**
 * 進捗データを更新（差分更新方式）
 */
export async function updateProgress(
  userId: string,
  skillPhaseItemId: number,
  status: ProgressStatus,
  notes?: string
): Promise<boolean> {
  try {
    const progressFile = await readProgressData(userId);
    const existingIndex = progressFile.progress.findIndex(
      (p) => p.skillPhaseItemId === skillPhaseItemId
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // 既存の進捗を更新
      const existing = progressFile.progress[existingIndex];
      existing.status = status;
      if (status === 'completed' && !existing.completedDate) {
        existing.completedDate = now;
      } else if (status !== 'completed') {
        existing.completedDate = undefined;
      }
      if (notes !== undefined) {
        existing.notes = notes;
      }
    } else {
      // 新規の進捗を追加
      const newProgress: SkillProgress = {
        skillPhaseItemId,
        status,
        completedDate: status === 'completed' ? now : undefined,
        notes,
      };
      progressFile.progress.push(newProgress);
    }

    progressFile.updatedAt = now;
    await writeProgressData(userId, progressFile);

    debug(
      MODULE_NAME,
      `進捗更新: userId=${userId}, itemId=${skillPhaseItemId}, status=${status}`
    );
    return true;
  } catch (err) {
    error(MODULE_NAME, `進捗更新エラー: userId=${userId}, itemId=${skillPhaseItemId}`, err);
    return false;
  }
}

/**
 * 進捗データを削除
 */
export async function removeProgress(userId: string, skillPhaseItemId: number): Promise<boolean> {
  try {
    const progressFile = await readProgressData(userId);
    const index = progressFile.progress.findIndex((p) => p.skillPhaseItemId === skillPhaseItemId);

    if (index >= 0) {
      progressFile.progress.splice(index, 1);
      progressFile.updatedAt = new Date().toISOString();
      await writeProgressData(userId, progressFile);

      debug(MODULE_NAME, `進捗削除: userId=${userId}, itemId=${skillPhaseItemId}`);
      return true;
    }

    return false;
  } catch (err) {
    error(MODULE_NAME, `進捗削除エラー: userId=${userId}, itemId=${skillPhaseItemId}`, err);
    return false;
  }
}

// スキル-資料関連付けの型定義
export interface SkillMaterialRelation {
  skillPhaseItemId: number;
  materialId: string;
  displayOrder: number | null;
  createdDate: string;
}

/**
 * スキル項目に関連付けられた資料を取得
 */
export function getSkillPhaseItemMaterials(skillPhaseItemId: number): SkillMaterialRelation[] {
  try {
    const db = getDatabase();
    const relations = db
      .prepare(
        `
      SELECT 
        skill_phase_item_id as skillPhaseItemId,
        material_id as materialId,
        display_order as displayOrder,
        created_date as createdDate
      FROM skill_phase_item_materials
      WHERE skill_phase_item_id = ?
      ORDER BY COALESCE(display_order, 999999), created_date
    `
      )
      .all(skillPhaseItemId) as SkillMaterialRelation[];

    debug(MODULE_NAME, `スキル項目の関連資料取得: itemId=${skillPhaseItemId}, ${relations.length}件`);
    return relations;
  } catch (err) {
    error(MODULE_NAME, `スキル項目の関連資料取得エラー: itemId=${skillPhaseItemId}`, err);
    return [];
  }
}

/**
 * 複数のスキル項目に関連付けがあるかどうかを一括取得（最適化版）
 * @param skillPhaseItemIds スキル項目IDの配列
 * @returns 関連付けがあるスキル項目IDのSet
 */
export function getSkillPhaseItemsWithMaterials(skillPhaseItemIds: number[]): Set<number> {
  try {
    if (skillPhaseItemIds.length === 0) {
      return new Set();
    }

    const db = getDatabase();
    // IN句で一度に取得
    const placeholders = skillPhaseItemIds.map(() => '?').join(',');
    const relations = db
      .prepare(
        `
      SELECT DISTINCT skill_phase_item_id as skillPhaseItemId
      FROM skill_phase_item_materials
      WHERE skill_phase_item_id IN (${placeholders})
    `
      )
      .all(...skillPhaseItemIds) as Array<{ skillPhaseItemId: number }>;

    const linkedIds = new Set(relations.map((r) => r.skillPhaseItemId));
    debug(MODULE_NAME, `一括関連付けチェック: ${skillPhaseItemIds.length}件中${linkedIds.size}件に関連付けあり`);
    return linkedIds;
  } catch (err) {
    error(MODULE_NAME, '一括関連付けチェックエラー:', err);
    return new Set();
  }
}

/**
 * 資料に関連付けられたスキル項目を取得
 */
export function getMaterialSkillPhaseItems(materialId: string): number[] {
  try {
    const db = getDatabase();
    const relations = db
      .prepare(
        `
      SELECT skill_phase_item_id
      FROM skill_phase_item_materials
      WHERE material_id = ?
    `
      )
      .all(materialId) as Array<{ skill_phase_item_id: number }>;

    const skillPhaseItemIds = relations.map((r) => r.skill_phase_item_id);
    debug(MODULE_NAME, `資料の関連スキル項目取得: materialId=${materialId}, ${skillPhaseItemIds.length}件`);
    return skillPhaseItemIds;
  } catch (err) {
    error(MODULE_NAME, `資料の関連スキル項目取得エラー: materialId=${materialId}`, err);
    return [];
  }
}

/**
 * 複数の資料に関連付けられたスキル項目を一括取得（最適化版）
 * @param materialIds 資料IDの配列
 * @returns 関連付けがあるスキル項目IDのSet
 */
export function getMaterialsSkillPhaseItems(materialIds: string[]): Set<number> {
  try {
    if (materialIds.length === 0) {
      return new Set();
    }

    const db = getDatabase();
    // IN句で一度に取得
    const placeholders = materialIds.map(() => '?').join(',');
    const relations = db
      .prepare(
        `
      SELECT DISTINCT skill_phase_item_id as skillPhaseItemId
      FROM skill_phase_item_materials
      WHERE material_id IN (${placeholders})
    `
      )
      .all(...materialIds) as Array<{ skillPhaseItemId: number }>;

    const skillPhaseItemIds = new Set(relations.map((r) => r.skillPhaseItemId));
    debug(MODULE_NAME, `一括関連スキル項目取得: materialIds=${materialIds.length}件, ${skillPhaseItemIds.size}件のスキル項目に関連付けあり`);
    return skillPhaseItemIds;
  } catch (err) {
    error(MODULE_NAME, '一括関連スキル項目取得エラー:', err);
    return new Set();
  }
}

/**
 * スキル項目と資料を関連付け
 */
export function linkSkillPhaseItemToMaterial(
  skillPhaseItemId: number,
  materialId: string,
  displayOrder?: number | null
): boolean {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT OR REPLACE INTO skill_phase_item_materials (
        skill_phase_item_id,
        material_id,
        display_order,
        created_date
      ) VALUES (?, ?, ?, ?)
    `
    ).run(skillPhaseItemId, materialId, displayOrder || null, now);

    info(MODULE_NAME, `スキル項目と資料を関連付け: itemId=${skillPhaseItemId}, materialId=${materialId}`);
    return true;
  } catch (err) {
    error(
      MODULE_NAME,
      `スキル項目と資料の関連付けエラー: itemId=${skillPhaseItemId}, materialId=${materialId}`,
      err
    );
    return false;
  }
}

/**
 * スキル項目と資料の関連付けを解除
 */
export function unlinkSkillPhaseItemFromMaterial(skillPhaseItemId: number, materialId: string): boolean {
  try {
    const db = getDatabase();
    db.prepare(
      `
      DELETE FROM skill_phase_item_materials
      WHERE skill_phase_item_id = ? AND material_id = ?
    `
    ).run(skillPhaseItemId, materialId);

    info(MODULE_NAME, `スキル項目と資料の関連付け解除: itemId=${skillPhaseItemId}, materialId=${materialId}`);
    return true;
  } catch (err) {
    error(
      MODULE_NAME,
      `スキル項目と資料の関連付け解除エラー: itemId=${skillPhaseItemId}, materialId=${materialId}`,
      err
    );
    return false;
  }
}

/**
 * スキル項目と資料の関連付けをトグル（既存なら解除、なければ追加）
 */
export function toggleSkillPhaseItemMaterialLink(
  skillPhaseItemId: number,
  materialId: string
): { linked: boolean; success: boolean } {
  try {
    const db = getDatabase();
    const existing = db
      .prepare(
        `
      SELECT 1 FROM skill_phase_item_materials
      WHERE skill_phase_item_id = ? AND material_id = ?
    `
      )
      .get(skillPhaseItemId, materialId);

    if (existing) {
      // 既存の関連付けを解除
      const success = unlinkSkillPhaseItemFromMaterial(skillPhaseItemId, materialId);
      return { linked: false, success };
    } else {
      // 新規に関連付け
      const success = linkSkillPhaseItemToMaterial(skillPhaseItemId, materialId);
      return { linked: true, success };
    }
  } catch (err) {
    error(
      MODULE_NAME,
      `スキル項目と資料の関連付けトグルエラー: itemId=${skillPhaseItemId}, materialId=${materialId}`,
      err
    );
    return { linked: false, success: false };
  }
}

