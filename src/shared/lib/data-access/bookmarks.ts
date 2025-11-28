// お気に入り数集計のデータアクセス層

import { readJSON } from '@/shared/lib/file-system/json';
import path from 'path';
import fs from 'fs';
import { info, error } from '../logger';
import { getUsersRootPath } from '@/shared/lib/file-system/user-storage';

const MODULE_NAME = 'bookmarks';

/**
 * 全資料のお気に入り数を一括取得
 * @param materialIds 資料IDの配列
 * @returns 資料IDをキー、お気に入り数を値とするMap
 */
export async function getBookmarkCounts(materialIds: string[]): Promise<Map<string, number>> {
  const bookmarkCounts = new Map<string, number>();
  
  // 初期化：すべて0に設定
  materialIds.forEach(id => {
    bookmarkCounts.set(id, 0);
  });

  try {
    const usersDir = getUsersRootPath();
    
    // ユーザーディレクトリが存在しない場合は空のMapを返す
    if (!fs.existsSync(usersDir)) {
      return bookmarkCounts;
    }

    // 全ユーザーのbookmarks.jsonを読み込んで集計
    const userDirs = fs.readdirSync(usersDir, { withFileTypes: true });
    
    for (const userDir of userDirs) {
      if (!userDir.isDirectory()) {
        continue;
      }

      const bookmarksPath = path.join(usersDir, userDir.name, 'bookmarks.json');
      
      if (fs.existsSync(bookmarksPath)) {
        try {
          const bookmarks = await readJSON(bookmarksPath);
          
          if (Array.isArray(bookmarks)) {
            // このユーザーがお気に入りに登録している資料IDをカウント
            bookmarks.forEach((materialId: string) => {
              if (bookmarkCounts.has(materialId)) {
                bookmarkCounts.set(materialId, (bookmarkCounts.get(materialId) || 0) + 1);
              }
            });
          }
        } catch (err) {
          error(MODULE_NAME, `お気に入り数集計エラー (${userDir.name}):`, err);
          // エラーが発生しても続行
        }
      }
    }
  } catch (err) {
    error(MODULE_NAME, 'お気に入り数集計エラー:', err);
  }

  return bookmarkCounts;
}


