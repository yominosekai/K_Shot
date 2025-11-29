// お気に入り数集計のデータアクセス層

import { readJSON, writeJSON } from '@/shared/lib/file-system/json';
import path from 'path';
import fs from 'fs';
import { info, error, debug } from '../logger';
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

/**
 * 全ユーザーのbookmarks.jsonから指定された資料IDを削除
 * @param materialId 削除する資料ID
 * @returns 削除したユーザー数
 */
export async function removeMaterialFromAllBookmarks(materialId: string): Promise<number> {
  let removedCount = 0;

  try {
    const usersDir = getUsersRootPath();
    
    // ユーザーディレクトリが存在しない場合は0を返す
    if (!fs.existsSync(usersDir)) {
      return 0;
    }

    // 全ユーザーのbookmarks.jsonを読み込んで削除
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
            // 該当資料IDが含まれているかチェック
            const index = bookmarks.indexOf(materialId);
            if (index !== -1) {
              // 削除
              bookmarks.splice(index, 1);
              // 保存
              await writeJSON(bookmarksPath, bookmarks);
              removedCount++;
              debug(MODULE_NAME, `お気に入りから削除: userId=${userDir.name}, materialId=${materialId}`);
            }
          }
        } catch (err) {
          error(MODULE_NAME, `お気に入り削除エラー (${userDir.name}):`, err);
          // エラーが発生しても続行
        }
      }
    }
  } catch (err) {
    error(MODULE_NAME, 'お気に入り削除エラー:', err);
  }

  if (removedCount > 0) {
    info(MODULE_NAME, `全ユーザーのお気に入りから削除完了: materialId=${materialId}, 削除ユーザー数=${removedCount}`);
  }

  return removedCount;
}

/**
 * 特定のユーザーのbookmarks.jsonから指定された資料IDを削除
 * @param userId ユーザーID
 * @param materialId 削除する資料ID
 * @returns 削除に成功した場合true
 */
export async function removeMaterialFromUserBookmarks(userId: string, materialId: string): Promise<boolean> {
  try {
    const { getUserSubPath } = await import('@/shared/lib/file-system/user-storage');
    const bookmarksPath = getUserSubPath(userId, 'bookmarks.json');
    
    // ファイルが存在しない場合はfalseを返す
    if (!fs.existsSync(bookmarksPath)) {
      return false;
    }

    const bookmarks = await readJSON(bookmarksPath);
    
    if (!Array.isArray(bookmarks)) {
      return false;
    }

    // 該当資料IDが含まれているかチェック
    const index = bookmarks.indexOf(materialId);
    if (index === -1) {
      return false; // お気に入りに存在しない
    }

    // 削除
    bookmarks.splice(index, 1);
    
    // 保存
    await writeJSON(bookmarksPath, bookmarks);
    
    debug(MODULE_NAME, `お気に入りから削除: userId=${userId}, materialId=${materialId}`);
    
    return true;
  } catch (err) {
    error(MODULE_NAME, `お気に入り削除エラー (userId=${userId}, materialId=${materialId}):`, err);
    return false;
  }
}


