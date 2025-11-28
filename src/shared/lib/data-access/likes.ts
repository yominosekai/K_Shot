// いいね状態集計のデータアクセス層

import { getDatabase } from '../database/db';
import { debug, error } from '../logger';

const MODULE_NAME = 'likes';

/**
 * 複数資料のいいね状態を一括取得
 * @param materialIds 資料IDの配列
 * @param userSid ユーザーSID
 * @returns いいね済みの資料IDのSet
 */
export function getLikeStatuses(materialIds: string[], userSid: string): Set<string> {
  const likedMaterialIds = new Set<string>();

  if (materialIds.length === 0 || !userSid) {
    return likedMaterialIds;
  }

  try {
    const db = getDatabase();
    
    // IN句を使用して一括取得
    const placeholders = materialIds.map(() => '?').join(',');
    const query = `
      SELECT material_id
      FROM material_likes
      WHERE material_id IN (${placeholders}) AND user_sid = ?
    `;
    
    const results = db.prepare(query).all(...materialIds, userSid) as Array<{
      material_id: string;
    }>;
    
    // 結果をSetに追加
    results.forEach(result => {
      likedMaterialIds.add(result.material_id);
    });
    
    debug(MODULE_NAME, `いいね状態一括取得完了: ${materialIds.length}件中${results.length}件がいいね済み`);
  } catch (err) {
    error(MODULE_NAME, 'いいね状態一括取得エラー:', err);
  }

  return likedMaterialIds;
}






