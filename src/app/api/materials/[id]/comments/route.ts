// 資料コメントAPI

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialComments, createComment, updateComment, deleteComment } from '@/shared/lib/data-access/comments';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { createNotification } from '@/shared/lib/data-access/notifications';
import { info, error, debug } from '@/shared/lib/logger';
import type { CommentAttachment, CommentLink } from '@/features/comments/types';

const MODULE_NAME = 'api/materials/[id]/comments';

/**
 * GET /api/materials/[id]/comments
 * 資料のコメント一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('user_id');

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 401 }
      );
    }

    // 資料情報を取得（作成者情報のため）
    const material = await getMaterialDetail(materialId);
    if (!material) {
      return NextResponse.json(
        { success: false, error: '資料が見つかりません' },
        { status: 404 }
      );
    }

    const comments = await getMaterialComments(materialId, currentUserId, material.created_by || '');

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      { success: false, error: 'コメントの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/[id]/comments
 * コメントを作成
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const formData = await request.formData();

    const content = formData.get('content') as string;
    const parentCommentId = formData.get('parent_comment_id') as string | null;
    const createdBy = formData.get('created_by') as string;
    const isPrivate = formData.get('is_private') === 'true';
    const attachmentsJson = formData.get('attachments') as string | null;
    const linksJson = formData.get('links') as string | null;
    const tempCommentId = formData.get('temp_comment_id') as string | null;

    // バリデーション
    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'コメント内容が入力されていません' },
        { status: 400 }
      );
    }

    if (!createdBy) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 401 }
      );
    }

    // 添付ファイルとリンクをパース
    let attachments: CommentAttachment[] = [];
    let links: CommentLink[] = [];

    if (attachmentsJson) {
      try {
        attachments = JSON.parse(attachmentsJson);
      } catch (err) {
        error(MODULE_NAME, '添付ファイルのパースエラー:', err);
      }
    }

    if (linksJson) {
      try {
        links = JSON.parse(linksJson);
      } catch (err) {
        error(MODULE_NAME, 'リンクのパースエラー:', err);
      }
    }

    // コメントを作成
    const comment = await createComment(
      materialId,
      parentCommentId || null,
      createdBy,
      content.trim(),
      isPrivate,
      attachments,
      links
    );

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'コメントの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 資料情報を取得（通知送信用）
    const material = await getMaterialDetail(materialId);
    if (material && material.created_by && material.created_by !== createdBy) {
      // 資料作成者に通知を送信（自分へのコメントは通知しない）
      await createNotification(
        material.created_by,
        createdBy,
        materialId,
        'コメントが追加されました',
        `${material.title}にコメントが追加されました`,
        'material_notification'
      );
    }

    // 返信の場合、親コメントの作成者にも通知
    if (parentCommentId && material) {
      const { getDatabase } = await import('@/shared/lib/database/db');
      const db = getDatabase();
      const parentComment = db.prepare('SELECT created_by FROM material_comments WHERE id = ?').get(parentCommentId) as { created_by: string } | undefined;
      
      if (parentComment && parentComment.created_by !== createdBy && parentComment.created_by !== material.created_by) {
        // 親コメント作成者に通知（自分への返信は通知しない、資料作成者への通知は上で既に送っている）
        await createNotification(
          parentComment.created_by,
          createdBy,
          materialId,
          'コメントへの返信が追加されました',
          `${material.title}のコメントに返信が追加されました`,
          'material_notification'
        );
      }
    }

    debug(MODULE_NAME, `コメント作成成功: commentId=${comment.id}, materialId=${materialId}`);

    // tempディレクトリを実際のコメントIDディレクトリに移動
    if (tempCommentId && attachments.length > 0) {
      try {
        const { getMaterialDetail } = await import('@/shared/lib/data-access/materials');
        const { DRIVE_CONFIG } = await import('@/config/drive');
        const path = await import('path');
        const fs = await import('fs/promises');
        
        const material = await getMaterialDetail(materialId);
        if (material) {
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
          const tempDir = path.join(commentsBaseDir, tempCommentId);
          const actualDir = path.join(commentsBaseDir, comment.id);

          // tempディレクトリが存在する場合、実際のコメントIDディレクトリに移動
          try {
            await fs.access(tempDir);
            // 実際のディレクトリが既に存在する場合は削除（念のため）
            try {
              await fs.access(actualDir);
              await fs.rm(actualDir, { recursive: true, force: true });
            } catch {
              // 存在しない場合は問題なし
            }
            // tempディレクトリを実際のコメントIDディレクトリにリネーム
            await fs.rename(tempDir, actualDir);
            debug(MODULE_NAME, `tempディレクトリを移動: ${tempDir} -> ${actualDir}`);
          } catch (err: any) {
            if (err.code !== 'ENOENT') {
              error(MODULE_NAME, `tempディレクトリの移動に失敗: ${tempDir} -> ${actualDir}`, err);
            }
            // ENOENTの場合は既に移動済みか、存在しないので問題なし
          }
        }
      } catch (err) {
        error(MODULE_NAME, 'tempディレクトリ移動処理エラー:', err);
        // 移動に失敗しても、コメント作成は成功しているので続行
      }
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (err) {
    error(MODULE_NAME, 'POST エラー:', err);
    return NextResponse.json(
      { success: false, error: 'コメントの作成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/materials/[id]/comments
 * コメントを更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const body = await request.json();

    const commentId = body.comment_id as string;
    const content = body.content as string;
    const attachments = (body.attachments || []) as CommentAttachment[];
    const links = (body.links || []) as CommentLink[];
    const currentUserId = body.user_id as string;

    // バリデーション
    if (!commentId || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 401 }
      );
    }

    // コメントの所有者を確認
    const { getDatabase } = await import('@/shared/lib/database/db');
    const db = getDatabase();
    const comment = db.prepare('SELECT created_by FROM material_comments WHERE id = ?').get(commentId) as { created_by: string } | undefined;

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    if (comment.created_by !== currentUserId) {
      return NextResponse.json(
        { success: false, error: 'このコメントを編集する権限がありません' },
        { status: 403 }
      );
    }

    // コメントを更新
    const success = await updateComment(commentId, content.trim(), attachments, links);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'コメントの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'コメントを更新しました',
    });
  } catch (err) {
    error(MODULE_NAME, 'PUT エラー:', err);
    return NextResponse.json(
      { success: false, error: 'コメントの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id]/comments
 * コメントを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('comment_id');
    const currentUserId = searchParams.get('user_id');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'コメントIDが指定されていません' },
        { status: 400 }
      );
    }

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 401 }
      );
    }

    // コメントの所有者を確認
    const { getDatabase } = await import('@/shared/lib/database/db');
    const db = getDatabase();
    const comment = db.prepare('SELECT created_by FROM material_comments WHERE id = ?').get(commentId) as { created_by: string } | undefined;

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    if (comment.created_by !== currentUserId) {
      return NextResponse.json(
        { success: false, error: 'このコメントを削除する権限がありません' },
        { status: 403 }
      );
    }

    // コメントを削除（添付ファイルも削除）
    const success = await deleteComment(commentId, materialId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'コメントの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'コメントを削除しました',
    });
  } catch (err) {
    error(MODULE_NAME, 'DELETE エラー:', err);
    return NextResponse.json(
      { success: false, error: 'コメントの削除に失敗しました' },
      { status: 500 }
    );
  }
}

