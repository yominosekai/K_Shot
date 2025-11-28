// 管理者用フィードバックAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/features/auth/api/auth';
import { getAllFeedbackMetadata, getFeedbackDetail } from '@/shared/lib/data-access/feedback';
import { DRIVE_CONFIG } from '@/config/drive';
import path from 'path';
import fs from 'fs';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/feedback';

/**
 * GET /api/admin/feedback
 * 管理者用：全フィードバックの一覧を取得（メタデータ + 詳細）
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser();
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 管理者権限チェック
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const statusFilter = searchParams.get('status'); // open, resolved, closed
    const isPublicFilter = searchParams.get('is_public'); // true, false

    // メタデータを取得
    let metadata = getAllFeedbackMetadata();

    // フィルタリング
    if (statusFilter) {
      metadata = metadata.filter(m => m.status === statusFilter);
    }
    if (isPublicFilter !== null) {
      const isPublic = isPublicFilter === 'true';
      metadata = metadata.filter(m => m.is_public === (isPublic ? 1 : 0));
    }

    // 詳細を含める場合
    if (includeDetails) {
      const feedbacksWithDetails = await Promise.all(
        metadata.map(async (meta) => {
          const detail = await getFeedbackDetail(meta.id, meta.user_sid);
          return {
            ...meta,
            content: detail?.content || '',
            is_public: meta.is_public === 1,
            response: detail?.response,
          };
        })
      );

      return NextResponse.json({
        success: true,
        feedbacks: feedbacksWithDetails,
        total: feedbacksWithDetails.length,
      });
    }

    // メタデータのみ返す
    return NextResponse.json({
      success: true,
      feedbacks: metadata.map(m => ({
        ...m,
        is_public: m.is_public === 1,
      })),
      total: metadata.length,
    });
  } catch (err) {
    error(MODULE_NAME, 'フィードバック一覧取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'フィードバック一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

