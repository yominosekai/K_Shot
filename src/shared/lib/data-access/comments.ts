// コメントデータアクセス層

import { getDatabase } from '../database/db';
import { info, error, debug } from '../logger';
import type { MaterialComment, MaterialCommentNormalized, CommentAttachment, CommentLink } from '@/features/comments/types';

const MODULE_NAME = 'comments';

/**
 * 資料のコメント一覧を取得（権限チェック付き）
 */
export async function getMaterialComments(
  materialId: string,
  currentUserSid: string,
  materialCreatedBy: string
): Promise<MaterialCommentNormalized[]> {
  try {
    debug(MODULE_NAME, `getMaterialComments開始: materialId=${materialId}, currentUserSid=${currentUserSid}`);

    const db = getDatabase();

    // まず全てのコメントを取得
    const comments = db.prepare(`
      SELECT 
        c.*,
        u.display_name as created_by_name,
        u.avatar as created_by_avatar
      FROM material_comments c
      LEFT JOIN users u ON c.created_by = u.sid
      WHERE c.material_id = ?
      ORDER BY c.created_date ASC
    `).all(materialId) as any[];

    // 権限チェックと正規化
    const normalizedComments: MaterialCommentNormalized[] = comments.map((row) => {
      const isPrivate = row.is_private === 1;
      const isCreator = row.created_by === currentUserSid;
      const isMaterialCreator = currentUserSid === materialCreatedBy;

      // 可視性チェック
      let canView = false;
      if (!isPrivate) {
        // publicコメントは全員見られる
        canView = true;
      } else {
        // privateコメントは作成者または資料作成者のみ
        if (isCreator || isMaterialCreator) {
          canView = true;
        } else {
          // 親コメントが自分のprivateコメントの場合、返信も見られる
          if (row.parent_comment_id) {
            const parentComment = comments.find((c) => c.id === row.parent_comment_id);
            if (parentComment && parentComment.created_by === currentUserSid && parentComment.is_private === 1) {
              canView = true;
            }
          }
        }
      }

      // 編集・削除権限（自分のコメントのみ）
      const can_edit = isCreator;
      const can_delete = isCreator;

      // 添付ファイルとリンクをパース
      let attachments: CommentAttachment[] = [];
      let links: CommentLink[] = [];

      try {
        if (row.attachments) {
          attachments = JSON.parse(row.attachments);
        }
      } catch (err) {
        error(MODULE_NAME, `添付ファイルのパースエラー: commentId=${row.id}`, err);
      }

      try {
        if (row.links) {
          links = JSON.parse(row.links);
        }
      } catch (err) {
        error(MODULE_NAME, `リンクのパースエラー: commentId=${row.id}`, err);
      }

      return {
        id: row.id,
        material_id: row.material_id,
        parent_comment_id: row.parent_comment_id,
        created_by: row.created_by,
        content: row.content,
        is_private: isPrivate,
        attachments,
        links,
        created_date: row.created_date,
        updated_date: row.updated_date,
        created_by_name: row.created_by_name || undefined,
        created_by_avatar: row.created_by_avatar || undefined,
        can_view: canView,
        can_edit: can_edit,
        can_delete: can_delete,
        replies: [],
      };
    });

    // 権限チェックで見られないコメントを除外
    const visibleComments = normalizedComments.filter((c) => c.can_view);

    // 階層構造を構築（再帰的に対応）
    const topLevelComments: MaterialCommentNormalized[] = [];

    // 返信を親コメントに紐付ける再帰関数
    const buildReplies = (commentId: string): MaterialCommentNormalized[] => {
      const replies: MaterialCommentNormalized[] = [];
      visibleComments.forEach((comment) => {
        if (comment.parent_comment_id === commentId) {
          // このコメントの返信も再帰的に取得
          comment.replies = buildReplies(comment.id);
          replies.push(comment);
        }
      });
      // 作成日時順にソート
      return replies.sort((a, b) => 
        new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      );
    };

    // トップレベルコメントを取得し、返信を再帰的に構築
    visibleComments.forEach((comment) => {
      if (!comment.parent_comment_id) {
        comment.replies = buildReplies(comment.id);
        topLevelComments.push(comment);
      }
    });

    // 作成日時順にソート
    topLevelComments.sort((a, b) => 
      new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
    );

    debug(MODULE_NAME, `getMaterialComments完了: materialId=${materialId}, 件数=${topLevelComments.length}`);
    return topLevelComments;
  } catch (err) {
    error(MODULE_NAME, `getMaterialCommentsエラー: materialId=${materialId}`, err);
    return [];
  }
}

/**
 * コメントを作成
 */
export async function createComment(
  materialId: string,
  parentCommentId: string | null,
  createdBy: string,
  content: string,
  isPrivate: boolean,
  attachments: CommentAttachment[] = [],
  links: CommentLink[] = []
): Promise<MaterialComment | null> {
  try {
    debug(MODULE_NAME, `createComment開始: materialId=${materialId}, createdBy=${createdBy}`);

    const db = getDatabase();
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO material_comments (
        id, material_id, parent_comment_id, created_by, content, is_private,
        attachments, links, created_date, updated_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      commentId,
      materialId,
      parentCommentId,
      createdBy,
      content,
      isPrivate ? 1 : 0,
      JSON.stringify(attachments),
      JSON.stringify(links),
      now,
      now
    );

    debug(MODULE_NAME, `コメント作成完了: commentId=${commentId}`);

    return {
      id: commentId,
      material_id: materialId,
      parent_comment_id: parentCommentId,
      created_by: createdBy,
      content,
      is_private: isPrivate,
      attachments,
      links,
      created_date: now,
      updated_date: now,
    };
  } catch (err) {
    error(MODULE_NAME, 'コメント作成エラー:', err);
    return null;
  }
}

/**
 * コメントを更新
 */
export async function updateComment(
  commentId: string,
  content: string,
  attachments: CommentAttachment[] = [],
  links: CommentLink[] = []
): Promise<boolean> {
  try {
    debug(MODULE_NAME, `updateComment開始: commentId=${commentId}`);

    const db = getDatabase();
    const now = new Date().toISOString();

    const update = db.prepare(`
      UPDATE material_comments
      SET content = ?, attachments = ?, links = ?, updated_date = ?
      WHERE id = ?
    `);

    update.run(
      content,
      JSON.stringify(attachments),
      JSON.stringify(links),
      now,
      commentId
    );

    debug(MODULE_NAME, `コメント更新完了: commentId=${commentId}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'コメント更新エラー:', err);
    return false;
  }
}

/**
 * コメントを削除（子コメントの添付ファイルも再帰的に削除）
 */
export async function deleteComment(commentId: string, materialId?: string): Promise<boolean> {
  try {
    debug(MODULE_NAME, `deleteComment開始: commentId=${commentId}`);

    const db = getDatabase();
    
    // 添付ファイルディレクトリを削除（materialIdが指定されている場合）
    if (materialId) {
      debug(MODULE_NAME, `添付ファイル削除処理開始: commentId=${commentId}, materialId=${materialId}`);
      try {
        const { getMaterialDetail } = await import('./materials');
        const { DRIVE_CONFIG } = await import('@/config/drive');
        const path = await import('path');
        const fs = await import('fs/promises');
        
        const material = await getMaterialDetail(materialId);
        if (material) {
          debug(MODULE_NAME, `資料情報取得成功: materialId=${materialId}, folderPath=${material.folder_path || 'なし'}`);
          const drivePath = DRIVE_CONFIG.DATA_DIR;
          const folderPath = material.folder_path || '';

          // コメント添付ファイルディレクトリのパスを構築
          let materialDir: string;
          if (folderPath && folderPath.trim() !== '') {
            const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
            materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
          } else {
            materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
          }

          const commentsBaseDir = path.join(drivePath, materialDir, 'comments');

          // 子コメント（返信）を再帰的に取得する関数
          const getChildCommentIds = (parentId: string): string[] => {
            const children = db.prepare('SELECT id FROM material_comments WHERE parent_comment_id = ?').all(parentId) as Array<{ id: string }>;
            const allIds: string[] = [];
            
            children.forEach((child) => {
              allIds.push(child.id);
              // 再帰的に子の子も取得
              const grandChildren = getChildCommentIds(child.id);
              allIds.push(...grandChildren);
            });
            
            return allIds;
          };

          // 子コメントIDを取得
          const childCommentIds = getChildCommentIds(commentId);
          debug(MODULE_NAME, `子コメントID取得: ${childCommentIds.length}件`, childCommentIds);

          // 子コメントの添付ファイルディレクトリを削除
          for (const childId of childCommentIds) {
            const childCommentsDir = path.join(commentsBaseDir, childId);
            try {
              // force: true により、存在しない場合でもエラーにならない
              await fs.rm(childCommentsDir, { recursive: true, force: true });
              debug(MODULE_NAME, `子コメント添付ファイルディレクトリを削除: ${childCommentsDir}`);
            } catch (err: any) {
              // force: trueを使っているので、ENOENTは発生しないはずだが、念のため
              error(MODULE_NAME, `子コメント添付ファイルディレクトリの削除に失敗: ${childCommentsDir}`, err);
            }
          }

          // 親コメントの添付ファイルディレクトリを削除
          const commentsDir = path.join(commentsBaseDir, commentId);
          try {
            // force: true により、存在しない場合でもエラーにならない
            await fs.rm(commentsDir, { recursive: true, force: true });
            debug(MODULE_NAME, `親コメント添付ファイルディレクトリを削除: ${commentsDir}`);
          } catch (err: any) {
            // force: trueを使っているので、ENOENTは発生しないはずだが、念のため
            error(MODULE_NAME, `親コメント添付ファイルディレクトリの削除に失敗: ${commentsDir}`, err);
          }
        }
      } catch (err) {
        error(MODULE_NAME, 'コメント添付ファイル削除処理エラー:', err);
        // 添付ファイル削除に失敗しても、コメント削除は続行
      }
    }

    // データベースからコメントを削除（CASCADEで子も削除される）
    const del = db.prepare('DELETE FROM material_comments WHERE id = ?');
    del.run(commentId);

    debug(MODULE_NAME, `コメント削除完了: commentId=${commentId}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'コメント削除エラー:', err);
    return false;
  }
}

/**
 * 資料のコメント数を取得
 */
export function getMaterialCommentCount(materialId: string): number {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM material_comments WHERE material_id = ?').get(materialId) as { count: number };
    return result.count;
  } catch (err) {
    error(MODULE_NAME, 'コメント数取得エラー:', err);
    return 0;
  }
}

/**
 * 複数資料のコメント数を一括取得
 * @param materialIds 資料IDの配列
 * @returns 資料IDをキー、コメント数を値とするMap
 */
export function getMaterialCommentCounts(materialIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  
  // 初期化：すべて0に設定
  materialIds.forEach(id => {
    counts.set(id, 0);
  });

  if (materialIds.length === 0) {
    return counts;
  }

  try {
    const db = getDatabase();
    
    // GROUP BYを使用して一括取得
    const placeholders = materialIds.map(() => '?').join(',');
    const query = `
      SELECT material_id, COUNT(*) as count
      FROM material_comments
      WHERE material_id IN (${placeholders})
      GROUP BY material_id
    `;
    
    const results = db.prepare(query).all(...materialIds) as Array<{
      material_id: string;
      count: number;
    }>;
    
    // 結果をMapに設定
    results.forEach(result => {
      counts.set(result.material_id, result.count);
    });
    
    debug(MODULE_NAME, `getMaterialCommentCounts完了: ${materialIds.length}件中${results.length}件にコメントあり`);
  } catch (err) {
    error(MODULE_NAME, 'コメント数一括取得エラー:', err);
  }

  return counts;
}

