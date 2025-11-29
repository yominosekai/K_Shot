// ゴミ箱管理API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getTrashItems, restoreFromTrash, deleteFromTrash } from '@/shared/lib/data-access/trash';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/trash';

/**
 * GET /api/trash
 * ゴミ箱一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const items = await getTrashItems();
    return NextResponse.json({
      success: true,
      items,
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ゴミ箱一覧の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trash
 * ゴミ箱に移動
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, original_id, original_path, original_name, user_id, original_folder_path } = body;

    if (!type || !original_id || !original_path || !original_name || !user_id) {
      return NextResponse.json(
        {
          success: false,
          error: '必須フィールドが不足しています',
        },
        { status: 400 }
      );
    }

    // 相対パスを完全なパスに変換
    const { getDrivePath } = await import('@/shared/lib/data-access/materials');
    const drivePath = getDrivePath();
    const fullPath = original_path.startsWith(drivePath)
      ? original_path
      : `${drivePath}\\${original_path.replace(/\//g, '\\')}`;

    const { moveToTrash } = await import('@/shared/lib/data-access/trash');
    const trashItem = await moveToTrash(
      type,
      original_id,
      fullPath,
      original_name,
      user_id,
      original_folder_path
    );

    if (!trashItem) {
      return NextResponse.json(
        {
          success: false,
          error: 'ゴミ箱への移動に失敗しました',
        },
        { status: 500 }
      );
    }

    // SQLiteからも削除
    if (type === 'material') {
      // materialsテーブルから削除
      const { getDatabase } = await import('@/shared/lib/database/db');
      const db = getDatabase();
      
      try {
        const deleteStmt = db.prepare('DELETE FROM materials WHERE id = ?');
        const result = deleteStmt.run(original_id);
        
        if (result.changes === 0) {
          debug(MODULE_NAME, `削除対象の資料が見つかりませんでした（既に削除済みの可能性）: original_id=${original_id}`);
        } else {
          debug(MODULE_NAME, `SQLiteから資料を削除: original_id=${original_id}`);
        }
      } catch (err) {
        error(MODULE_NAME, 'SQLiteからの資料削除に失敗:', err);
        // SQLite削除に失敗しても、ゴミ箱への移動は成功しているので、エラーを返さない
        // （既にゴミ箱に移動済みの可能性があるため）
      }

      // 削除を実行したユーザーのお気に入りから削除
      try {
        const { removeMaterialFromUserBookmarks } = await import('@/shared/lib/data-access/bookmarks');
        const removed = await removeMaterialFromUserBookmarks(user_id, original_id);
        if (removed) {
          info(MODULE_NAME, `ユーザーのお気に入りから削除: userId=${user_id}, materialId=${original_id}`);
        }
      } catch (err) {
        error(MODULE_NAME, 'お気に入りからの削除に失敗:', err);
        // お気に入り削除に失敗しても、ゴミ箱への移動は成功しているので、エラーを返さない
      }
    } else if (type === 'folder') {
      // foldersテーブルから削除（再帰的に子フォルダとフォルダ内の資料も削除）
      const { getDatabase } = await import('@/shared/lib/database/db');
      const db = getDatabase();
      
      try {
        // フォルダ情報を取得（パスを取得するため）
        const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(original_id) as any;
        if (!folder) {
          debug(MODULE_NAME, `削除対象のフォルダが見つかりませんでした（既に削除済みの可能性）: original_id=${original_id}`);
        } else {
          const folderPath = folder.path || '';
          
          // 1. フォルダ内の資料を削除（folder_pathがフォルダのパスで始まるもの）
          const materialsInFolder = db.prepare('SELECT id FROM materials WHERE folder_path = ? OR folder_path LIKE ?').all(
            folderPath,
            `${folderPath}/%`
          ) as Array<{ id: string }>;
          
          // 削除を実行したユーザーのお気に入りから削除するための資料IDリスト
          const materialIdsToRemove: string[] = [];
          
          for (const material of materialsInFolder) {
            const deleteMaterialStmt = db.prepare('DELETE FROM materials WHERE id = ?');
            deleteMaterialStmt.run(material.id);
            materialIdsToRemove.push(material.id);
            debug(MODULE_NAME, `フォルダ内の資料を削除: material_id=${material.id}`);
          }
          
          // 2. サブフォルダを再帰的に取得して削除
          const getSubfolders = (parentId: string): string[] => {
            const children = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(parentId) as Array<{ id: string }>;
            const allIds: string[] = [];
            
            for (const child of children) {
              allIds.push(child.id);
              // 再帰的に子の子も取得
              const grandChildren = getSubfolders(child.id);
              allIds.push(...grandChildren);
            }
            
            return allIds;
          };
          
          const subfolderIds = getSubfolders(original_id);
          
          // サブフォルダを削除（深い階層から順に削除するため、逆順で処理）
          for (let i = subfolderIds.length - 1; i >= 0; i--) {
            const subfolderId = subfolderIds[i];
            // サブフォルダ内の資料も削除
            const subfolder = db.prepare('SELECT path FROM folders WHERE id = ?').get(subfolderId) as any;
            if (subfolder) {
              const subfolderPath = subfolder.path || '';
              const materialsInSubfolder = db.prepare('SELECT id FROM materials WHERE folder_path = ? OR folder_path LIKE ?').all(
                subfolderPath,
                `${subfolderPath}/%`
              ) as Array<{ id: string }>;
              
              for (const material of materialsInSubfolder) {
                const deleteMaterialStmt = db.prepare('DELETE FROM materials WHERE id = ?');
                deleteMaterialStmt.run(material.id);
                materialIdsToRemove.push(material.id);
                debug(MODULE_NAME, `サブフォルダ内の資料を削除: material_id=${material.id}`);
              }
            }
            
            const deleteSubfolderStmt = db.prepare('DELETE FROM folders WHERE id = ?');
            deleteSubfolderStmt.run(subfolderId);
            debug(MODULE_NAME, `サブフォルダを削除: folder_id=${subfolderId}`);
          }
          
          // 3. 最後に親フォルダを削除
          const deleteStmt = db.prepare('DELETE FROM folders WHERE id = ?');
          const result = deleteStmt.run(original_id);
          
          debug(MODULE_NAME, `SQLiteからフォルダを削除: original_id=${original_id}, 削除されたサブフォルダ数=${subfolderIds.length}, 削除された資料数=${materialsInFolder.length}`);
          
          // 削除を実行したユーザーのお気に入りから、フォルダ内の全資料を削除
          if (materialIdsToRemove.length > 0) {
            try {
              const { removeMaterialFromUserBookmarks } = await import('@/shared/lib/data-access/bookmarks');
              let removedCount = 0;
              for (const materialId of materialIdsToRemove) {
                const removed = await removeMaterialFromUserBookmarks(user_id, materialId);
                if (removed) {
                  removedCount++;
                }
              }
              if (removedCount > 0) {
                info(MODULE_NAME, `ユーザーのお気に入りから削除: userId=${user_id}, 削除資料数=${removedCount}/${materialIdsToRemove.length}`);
              }
            } catch (err) {
              error(MODULE_NAME, 'お気に入りからの削除に失敗:', err);
              // お気に入り削除に失敗しても、ゴミ箱への移動は成功しているので、エラーを返さない
            }
          }
        }
      } catch (err) {
        error(MODULE_NAME, 'SQLiteからのフォルダ削除に失敗:', err);
        // SQLite削除に失敗しても、ゴミ箱への移動は成功しているので、エラーを返さない
        // （既にゴミ箱に移動済みの可能性があるため）
      }
    }

    return NextResponse.json({
      success: true,
      trashItem,
    });
  } catch (err) {
    error(MODULE_NAME, 'POST エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ゴミ箱への移動に失敗しました',
      },
      { status: 500 }
    );
  }
}

