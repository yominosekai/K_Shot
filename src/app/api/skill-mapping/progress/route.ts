// スキルマッピング進捗データAPI

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import {
  getUserProgress,
  updateProgress,
  type ProgressStatus,
} from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/progress';

/**
 * GET /api/skill-mapping/progress
 * ユーザーの進捗データを取得（認証必須）
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

    // クエリパラメータからuserIdを取得（管理者が他のユーザーの進捗を確認する場合）
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId') || userId;

    // 自分の進捗のみ取得可能（管理者でも他のユーザーの進捗は取得できない）
    // 将来的に管理者が全ユーザーの進捗を取得する場合は、ここで権限チェックを追加
    if (targetUserId !== userId) {
      return NextResponse.json(
        { success: false, error: '他のユーザーの進捗データを取得する権限がありません' },
        { status: 403 }
      );
    }

    const progress = await getUserProgress(targetUserId);

    debug(MODULE_NAME, `進捗データ取得: userId=${targetUserId}, ${progress.length}件`);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (err) {
    error(MODULE_NAME, '進捗データ取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '進捗データの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/skill-mapping/progress
 * 進捗データを更新（認証必須）
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { skillPhaseItemId, status, notes } = body;

    // バリデーション
    if (!skillPhaseItemId || typeof skillPhaseItemId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'skillPhaseItemIdが必要です' },
        { status: 400 }
      );
    }

    if (!status || !['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '有効なstatusが必要です（not_started, in_progress, completed）' },
        { status: 400 }
      );
    }

    const success = await updateProgress(
      userId,
      skillPhaseItemId,
      status as ProgressStatus,
      notes
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: '進捗データの更新に失敗しました' },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `進捗更新: userId=${userId}, itemId=${skillPhaseItemId}, status=${status}`);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    error(MODULE_NAME, '進捗データ更新エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '進捗データの更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

