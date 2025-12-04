/**
 * パイロットテストフィードバックAPI
 * この機能は一時的なもので、テスト終了後は削除可能です
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import {
  savePilotFeedback,
  getUserPilotFeedback,
  getAllSavedPilotFeedbacks,
} from '@/shared/lib/data-access/pilot-feedback';
import { isPilotTestEnabled } from '@/config/pilot-test';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/pilot-feedback';

/**
 * GET /api/pilot-feedback
 * ユーザーのパイロットフィードバックを取得（下書き含む）
 */
export async function GET(request: NextRequest) {
  try {
    // 機能が有効かチェック
    if (!isPilotTestEnabled()) {
      return NextResponse.json(
        { success: false, error: 'パイロットテスト機能は現在無効です' },
        { status: 404 }
      );
    }

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

    const feedback = await getUserPilotFeedback(userId);

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (err) {
    error(MODULE_NAME, 'パイロットフィードバック取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'フィードバックの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pilot-feedback
 * パイロットフィードバックを保存（下書きまたは送信）
 */
export async function POST(request: NextRequest) {
  try {
    // 機能が有効かチェック
    if (!isPilotTestEnabled()) {
      return NextResponse.json(
        { success: false, error: 'パイロットテスト機能は現在無効です' },
        { status: 404 }
      );
    }

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
    const {
      scenes,
      evaluations,
      improvement_ideas,
      additional_comments,
    } = body;

    // バリデーション
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { success: false, error: '少なくとも1つの利用シーンを選択してください' },
        { status: 400 }
      );
    }

    if (!evaluations || typeof evaluations !== 'object') {
      return NextResponse.json(
        { success: false, error: '評価項目が不正です' },
        { status: 400 }
      );
    }

    // 必須の評価項目をチェック
    const requiredKeys = ['usability', 'business_fit', 'performance', 'quality', 'content_richness'];
    for (const key of requiredKeys) {
      if (!evaluations[key] || !evaluations[key].score) {
        return NextResponse.json(
          { success: false, error: `評価項目「${key}」のスコアが入力されていません` },
          { status: 400 }
        );
      }
    }

    const feedback = await savePilotFeedback(
      userId,
      {
        scenes: scenes || [],
        evaluations: evaluations as any,
        improvement_ideas: improvement_ideas || '',
        additional_comments: additional_comments || '',
      }
    );

    info(MODULE_NAME, `パイロットフィードバック保存: userId=${userId}`);

    return NextResponse.json({
      success: true,
      message: 'フィードバックを保存しました',
      feedback,
    });
  } catch (err) {
    error(MODULE_NAME, 'パイロットフィードバック保存エラー:', err);
    return NextResponse.json(
      { success: false, error: 'フィードバックの保存に失敗しました' },
      { status: 500 }
    );
  }
}

