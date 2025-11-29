// 管理者用フィードバックステータス更新・削除API

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { getAllFeedbackMetadata, updateFeedbackStatus, updateFeedbackResponse, deleteFeedback } from '@/shared/lib/data-access/feedback';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/feedback/[id]';

/**
 * PATCH /api/admin/feedback/[id]
 * フィードバックのステータスを更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証・管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id: feedbackId } = await params;
    const body = await request.json();
    const { status, response } = body;

    // メタデータからuser_idを取得
    const metadata = getAllFeedbackMetadata();
    const feedbackMeta = metadata.find((m) => m.id === feedbackId);
    
    if (!feedbackMeta) {
      return NextResponse.json(
        { success: false, error: 'フィードバックが見つかりません' },
        { status: 404 }
      );
    }

    // ステータス更新
    if (status) {
      if (!['open', 'resolved', 'closed'].includes(status)) {
        return NextResponse.json(
          { success: false, error: '無効なステータスです' },
          { status: 400 }
        );
      }

      const success = await updateFeedbackStatus(feedbackId, feedbackMeta.user_id, status);
      if (!success) {
        return NextResponse.json(
          { success: false, error: 'ステータスの更新に失敗しました' },
          { status: 500 }
        );
      }
      debug(MODULE_NAME, `フィードバックステータス更新: feedbackId=${feedbackId}, status=${status}`);
    }

    // 返事の追加・更新
    if (response !== undefined) {
      if (typeof response !== 'string' || response.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: '返事内容を入力してください' },
          { status: 400 }
        );
      }

      if (response.length > 10000) {
        return NextResponse.json(
          { success: false, error: '返事内容は10000文字以内で入力してください' },
          { status: 400 }
        );
      }

      const responderId = authResult.user.id;
      if (!responderId) {
        return NextResponse.json(
          { success: false, error: '返事の更新者IDを特定できませんでした' },
          { status: 500 }
        );
      }

      const success = await updateFeedbackResponse(
        feedbackId,
        feedbackMeta.user_id,
        response,
        responderId
      );
      if (!success) {
        return NextResponse.json(
          { success: false, error: '返事の更新に失敗しました' },
          { status: 500 }
        );
      }
      debug(MODULE_NAME, `フィードバック返事更新: feedbackId=${feedbackId}, responseBy=${responderId}`);
    }

    if (!status && response === undefined) {
      return NextResponse.json(
        { success: false, error: 'statusまたはresponseのいずれかを指定してください' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: status && response !== undefined ? 'ステータスと返事を更新しました' : status ? 'ステータスを更新しました' : '返事を更新しました',
    });
  } catch (err) {
    error(MODULE_NAME, 'フィードバックステータス更新エラー:', err);
    return NextResponse.json(
      { success: false, error: 'ステータスの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feedback/[id]
 * フィードバックを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証・管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { id: feedbackId } = await params;

    // メタデータからuser_idを取得
    const metadata = getAllFeedbackMetadata();
    const feedbackMeta = metadata.find((m) => m.id === feedbackId);
    
    if (!feedbackMeta) {
      return NextResponse.json(
        { success: false, error: 'フィードバックが見つかりません' },
        { status: 404 }
      );
    }

    const success = await deleteFeedback(feedbackId, feedbackMeta.user_id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'フィードバックの削除に失敗しました' },
        { status: 500 }
      );
    }

    info(MODULE_NAME, `フィードバック削除: feedbackId=${feedbackId}`);
    
    return NextResponse.json({
      success: true,
      message: 'フィードバックを削除しました',
    });
  } catch (err) {
    error(MODULE_NAME, 'フィードバック削除エラー:', err);
    return NextResponse.json(
      { success: false, error: 'フィードバックの削除に失敗しました' },
      { status: 500 }
    );
  }
}

