// ゴミ箱アイテム操作API Routes

import { NextRequest, NextResponse } from 'next/server';
import { restoreFromTrash, deleteFromTrash, getTrashItemPath } from '@/shared/lib/data-access/trash';
import { info, error, debug } from '@/shared/lib/logger';
import path from 'path';
import fs from 'fs/promises';

const MODULE_NAME = 'api/trash/[id]';

/**
 * PUT /api/trash/[id]
 * ゴミ箱から復元
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trashId = id;
    const body = await request.json();
    const { action } = body;

    if (action === 'restore') {
      // 復元前にアイテム情報を取得（restoreFromTrash内でCSVから削除されるため）
      const { getTrashItems } = await import('@/shared/lib/data-access/trash');
      const items = await getTrashItems();
      const item = items.find((i) => i.id === trashId);

      if (!item) {
        return NextResponse.json(
          {
            success: false,
            error: 'ゴミ箱アイテムが見つかりません',
          },
          { status: 404 }
        );
      }

      // 復元先の競合チェック
      const { getDatabase } = await import('@/shared/lib/database/db');
      const db = getDatabase();
      const { getDrivePath } = await import('@/shared/lib/data-access/materials');
      const drivePath = getDrivePath();

      if (item.type === 'folder') {
        // フォルダの場合：同じパスにフォルダが既に存在するかチェック
        const folderPath = item.original_folder_path || item.original_name;
        const existingFolder = db.prepare('SELECT id, name FROM folders WHERE path = ?').get(folderPath) as any;
        
        if (existingFolder) {
          return NextResponse.json(
            {
              success: false,
              error: `復元先に同名のフォルダ「${existingFolder.name}」が既に存在します。復元を中断しました。\n\n必要であれば、復元元をダウンロードして再度作成してください。`,
            },
            { status: 409 } // Conflict
          );
        }

        // ファイルシステム上にも存在するかチェック
        const folderDir = path.join(
          drivePath,
          'shared',
          'shared_materials',
          'folders',
          folderPath.replace(/\//g, path.sep)
        );
        
        try {
          const stats = await fs.stat(folderDir);
          if (stats.isDirectory()) {
            return NextResponse.json(
              {
                success: false,
                error: `復元先に同名のフォルダが既に存在します（ファイルシステム）。復元を中断しました。\n\n必要であれば、復元元をダウンロードして再度作成してください。`,
              },
              { status: 409 } // Conflict
            );
          }
        } catch (statErr: any) {
          // ディレクトリが存在しない場合は問題なし（復元可能）
          if (statErr.code !== 'ENOENT') {
            error(MODULE_NAME, 'フォルダ存在確認エラー:', statErr);
          }
        }
      } else if (item.type === 'material') {
        // 資料の場合：同じIDの資料が既に存在するかチェック
        const existingMaterial = db.prepare('SELECT id, title FROM materials WHERE id = ?').get(item.original_id) as any;
        
        if (existingMaterial) {
          return NextResponse.json(
            {
              success: false,
              error: `復元先に同名の資料「${existingMaterial.title}」が既に存在します。復元を中断しました。\n\n必要であれば、復元元をダウンロードして再度作成してください。`,
            },
            { status: 409 } // Conflict
          );
        }

        // ファイルシステム上にも存在するかチェック
        const folderPath = item.original_folder_path || '';
        let materialDir: string;
        if (folderPath && folderPath.trim() !== '') {
          const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
          materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${item.original_id}`);
        } else {
          materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${item.original_id}`);
        }
        
        const fullMaterialDir = path.join(drivePath, materialDir);
        
        try {
          const stats = await fs.stat(fullMaterialDir);
          if (stats.isDirectory()) {
            return NextResponse.json(
              {
                success: false,
                error: `復元先に同名の資料が既に存在します（ファイルシステム）。復元を中断しました。\n\n必要であれば、復元元をダウンロードして再度作成してください。`,
              },
              { status: 409 } // Conflict
            );
          }
        } catch (statErr: any) {
          // ディレクトリが存在しない場合は問題なし（復元可能）
          if (statErr.code !== 'ENOENT') {
            error(MODULE_NAME, '資料存在確認エラー:', statErr);
          }
        }
      }

      // ファイルシステムの復元
      const success = await restoreFromTrash(trashId);
      
      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: '復元に失敗しました',
          },
          { status: 500 }
        );
      }

      // SQLiteに復元
      if (item) {
        if (item.type === 'material') {
          // materialsテーブルに復元
          const { getDatabase } = await import('@/shared/lib/database/db');
          const db = getDatabase();
          
          try {
            // 復元後のパスからメタデータを読み込む
            const metadataPath = path.join(item.original_path, 'metadata.json');
            if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
              const { readJSON } = await import('@/shared/lib/file-system/json');
              const metadata = await readJSON(metadataPath);
              
              const insert = db.prepare(`
                INSERT INTO materials (
                  id, uuid, title, description, category_id, type, difficulty, estimated_hours,
                  tags, folder_path, created_by, created_date, updated_date,
                  is_published, views, likes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              
              insert.run(
                metadata.id,
                metadata.uuid,
                metadata.title,
                metadata.description || null,
                metadata.category_id || null,
                metadata.type,
                (metadata as any).difficulty || null,
                (metadata as any).estimated_hours ? parseFloat((metadata as any).estimated_hours.toString()) : null,
                metadata.tags ? metadata.tags.join(',') : '',
                item.original_folder_path || '',
                metadata.created_by,
                metadata.created_date,
                metadata.updated_date,
                metadata.is_published ? 1 : 0,
                metadata.views || 0,
                metadata.likes || 0
              );
              
              debug(MODULE_NAME, `SQLiteに資料を復元: id=${metadata.id}`);
            } else {
              error(MODULE_NAME, `メタデータファイルが見つかりません: ${metadataPath}`);
            }
          } catch (err) {
            error(MODULE_NAME, 'SQLiteへの資料復元に失敗:', err);
            // 復元に失敗しても、ファイルは復元されているので、エラーを返さない
          }
        } else if (item.type === 'folder') {
          // foldersテーブルに復元（再帰的に子フォルダとフォルダ内の資料も復元）
          const { getDatabase } = await import('@/shared/lib/database/db');
          const db = getDatabase();
          
          try {
            // 復元されたフォルダのパスを取得
            const restoredFolderPath = item.original_path;
            
            // フォルダ構造を走査して復元する関数
            const restoreFolderRecursive = async (folderDir: string, parentId: string, parentPath: string): Promise<void> => {
              try {
                const entries = await fs.readdir(folderDir, { withFileTypes: true });
                
                for (const entry of entries) {
                  const entryPath = path.join(folderDir, entry.name);
                  
                  if (entry.isDirectory()) {
                    // ディレクトリの場合
                    if (entry.name.startsWith('material_')) {
                      // 資料ディレクトリの場合
                      const materialId = entry.name.replace('material_', '');
                      const metadataPath = path.join(entryPath, 'metadata.json');
                      
                      if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
                        const { readJSON } = await import('@/shared/lib/file-system/json');
                        const metadata = await readJSON(metadataPath);
                        
                        // 資料をSQLiteに復元
                        const insertMaterial = db.prepare(`
                          INSERT INTO materials (
                            id, uuid, title, description, category_id, type, difficulty, estimated_hours,
                            tags, folder_path, created_by, created_date, updated_date,
                            is_published, views, likes
                          )
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        // フォルダパスを取得（親フォルダのパス）
                        const materialFolderPath = parentPath || '';
                        
                        insertMaterial.run(
                          metadata.id || materialId,
                          metadata.uuid || `uuid_${Date.now()}`,
                          metadata.title || '無題',
                          metadata.description || null,
                          metadata.category_id || null,
                          metadata.type || 'document',
                          (metadata as any).difficulty || null,
                          (metadata as any).estimated_hours ? parseFloat((metadata as any).estimated_hours.toString()) : null,
                          metadata.tags ? (Array.isArray(metadata.tags) ? metadata.tags.join(',') : metadata.tags) : '',
                          materialFolderPath,
                          metadata.created_by || item.deleted_by,
                          metadata.created_date || item.deleted_date,
                          metadata.updated_date || item.deleted_date,
                          metadata.is_published ? 1 : 0,
                          metadata.views || 0,
                          metadata.likes || 0
                        );
                        
                        debug(MODULE_NAME, `フォルダ内の資料を復元: id=${metadata.id || materialId}, folder_path=${materialFolderPath}`);
                      }
                    } else {
                      // サブフォルダの場合
                      // フォルダ名からフォルダIDを推測（通常はfolder_で始まるが、復元時は不明なため、新しいIDを生成）
                      // フォルダ内にmetadata.jsonがあるか確認（通常は存在しないが、念のため）
                      const folderMetadataPath = path.join(entryPath, 'metadata.json');
                      let folderId: string | null = null;
                      let folderName = entry.name;
                      let folderCreatedBy = item.deleted_by;
                      let folderCreatedDate = item.deleted_date;
                      let folderParentId = parentId;
                      
                      if (await fs.access(folderMetadataPath).then(() => true).catch(() => false)) {
                        // メタデータから情報を取得
                        const { readJSON } = await import('@/shared/lib/file-system/json');
                        const folderMetadata = await readJSON(folderMetadataPath);
                        folderId = folderMetadata.id || `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        folderName = folderMetadata.name || entry.name;
                        folderCreatedBy = folderMetadata.created_by || item.deleted_by;
                        folderCreatedDate = folderMetadata.created_date || item.deleted_date;
                        folderParentId = folderMetadata.parent_id || parentId;
                      } else {
                        // メタデータがない場合は新しいIDを生成
                        folderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      }
                      
                      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
                      
                      // フォルダをSQLiteに復元
                      const insertFolder = db.prepare(`
                        INSERT INTO folders (id, name, parent_id, path, created_by, created_date)
                        VALUES (?, ?, ?, ?, ?, ?)
                      `);
                      
                      insertFolder.run(
                        folderId,
                        folderName,
                        folderParentId,
                        folderPath,
                        folderCreatedBy,
                        folderCreatedDate
                      );
                      
                      debug(MODULE_NAME, `サブフォルダを復元: id=${folderId}, path=${folderPath}`);
                      
                      // 再帰的に子フォルダを処理
                      if (folderId) {
                        await restoreFolderRecursive(entryPath, folderId, folderPath);
                      }
                    }
                  }
                }
              } catch (err) {
                error(MODULE_NAME, `フォルダ走査エラー: ${folderDir}`, err);
              }
            };
            
            // 親フォルダの情報を復元
            // 親フォルダのパスから親フォルダIDを取得
            const folderPath = item.original_folder_path || item.original_name;
            let parentId = '';
            
            // フォルダパスは`/`区切りなので、最後の`/`より前の部分が親パス
            if (folderPath && folderPath.includes('/')) {
              const pathParts = folderPath.split('/');
              pathParts.pop(); // 最後の要素（現在のフォルダ名）を削除
              const parentPath = pathParts.join('/');
              
              if (parentPath) {
                // 親フォルダのパスから親フォルダIDを取得
                const parentFolder = db.prepare('SELECT id FROM folders WHERE path = ?').get(parentPath) as any;
                if (parentFolder) {
                  parentId = parentFolder.id;
                }
              }
            }
            
            // 親フォルダを復元
            const insert = db.prepare(`
              INSERT INTO folders (id, name, parent_id, path, created_by, created_date)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            insert.run(
              item.original_id,
              item.original_name,
              parentId,
              folderPath,
              item.deleted_by,
              item.deleted_date
            );
            
            debug(MODULE_NAME, `SQLiteにフォルダを復元: id=${item.original_id}, path=${folderPath}`);
            
            // 再帰的に子フォルダとフォルダ内の資料を復元
            await restoreFolderRecursive(restoredFolderPath, item.original_id, folderPath);
            
          } catch (err) {
            error(MODULE_NAME, 'SQLiteへのフォルダ復元に失敗:', err);
            // 復元に失敗しても、ファイルは復元されているので、エラーを返さない
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: '復元が完了しました',
      });
    } else if (action === 'delete') {
      const success = await deleteFromTrash(trashId);
      
      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: '完全削除に失敗しました',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '完全削除が完了しました',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '無効なアクションです',
        },
        { status: 400 }
      );
    }
  } catch (err) {
    error(MODULE_NAME, 'PUT エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '操作に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trash/[id]/download
 * ゴミ箱アイテムをダウンロード
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trashId = id;
    const trashItemPath = await getTrashItemPath(trashId);

    if (!trashItemPath) {
      return NextResponse.json(
        {
          success: false,
          error: 'ゴミ箱アイテムが見つかりません',
        },
        { status: 404 }
      );
    }

    // ファイル/フォルダをZIP化してダウンロード
    // TODO: ZIP化の実装（現時点ではパスを返す）
    return NextResponse.json({
      success: true,
      path: trashItemPath,
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ダウンロードに失敗しました',
      },
      { status: 500 }
    );
  }
}

