// フィードバックAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { saveFeedback, getUserFeedbacks, getAllPublicFeedbacksPaginated } from '@/shared/lib/data-access/feedback';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/feedback';

/**
 * GET /api/feedback
 * ユーザーのフィードバック一覧を取得（自分のフィードバック + 全員の公開フィードバック）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDを特定できませんでした' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // ユーザー自身の投稿履歴（公開・非公開を問わず全て）
    const myFeedbacks = await getUserFeedbacks(userId);
    
    // 全員の公開フィードバックをページネーション付きで取得
    const publicFeedbacksResult = await getAllPublicFeedbacksPaginated(page, limit);
    
    // 自分の公開フィードバックのIDを取得（重複排除用）
    const myPublicFeedbackIds = new Set(
      myFeedbacks.filter(f => f.is_public).map(f => f.id)
    );
    
    // 公開フィードバックから自分のものを除外（自分のフィードバックは既に含まれているため）
    const otherPublicFeedbacks = publicFeedbacksResult.feedbacks.filter(
      f => !myPublicFeedbackIds.has(f.id)
    );
    
    // 自分のフィードバックと他の公開フィードバックを統合
    // 自分のフィードバックを先に表示し、その後公開フィードバックを表示
    const allFeedbacks = [
      ...myFeedbacks,
      ...otherPublicFeedbacks,
    ];
    
    // 作成日時の降順でソート
    allFeedbacks.sort((a, b) => 
      new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );

    return NextResponse.json({
      success: true,
      feedbacks: allFeedbacks,
      pagination: publicFeedbacksResult.pagination,
    });
  } catch (err) {
    error(MODULE_NAME, 'フィードバック取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'フィードバックの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback
 * フィードバックを投稿
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { content, is_public } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'フィードバック内容を入力してください' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'フィードバック内容は10000文字以内で入力してください' },
        { status: 400 }
      );
    }

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDを特定できませんでした' },
        { status: 500 }
      );
    }
    const isPublic = is_public === true;
    
    const feedback = await saveFeedback(userId, content.trim(), isPublic);

    info(MODULE_NAME, `フィードバック投稿: userId=${userId}, feedbackId=${feedback.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'フィードバックを投稿しました',
      feedback,
    });
  } catch (err) {
    error(MODULE_NAME, 'フィードバック投稿エラー:', err);
    return NextResponse.json(
      { success: false, error: 'フィードバックの投稿に失敗しました' },
      { status: 500 }
    );
  }
}

