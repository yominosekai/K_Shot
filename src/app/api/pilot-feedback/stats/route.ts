/**
 * パイロットテストフィードバック統計API（管理者用）
 * この機能は一時的なもので、テスト終了後は削除可能です
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { getAllSavedPilotFeedbacks } from '@/shared/lib/data-access/pilot-feedback';
import { isPilotTestEnabled, PILOT_TEST_CONFIG } from '@/config/pilot-test';
import { error } from '@/shared/lib/logger';
import type { PilotFeedback } from '@/shared/lib/data-access/pilot-feedback';

const MODULE_NAME = 'api/pilot-feedback/stats';

/**
 * GET /api/pilot-feedback/stats
 * パイロットフィードバックの統計情報を取得（管理者のみ）
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

    // 管理者権限チェック
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const allFeedbacks = await getAllSavedPilotFeedbacks();

    // 統計情報を計算
    const stats = calculateStats(allFeedbacks);

    return NextResponse.json({
      success: true,
      stats,
      totalCount: allFeedbacks.length,
      feedbacks: allFeedbacks,
    });
  } catch (err) {
    error(MODULE_NAME, 'パイロットフィードバック統計取得エラー:', err);
    return NextResponse.json(
      { success: false, error: '統計情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

interface Stats {
  // 利用シーン別の回答数
  scenes: {
    knowledge_registration: number;
    search_reference: number;
    share_utilization: number;
    operation: number;
  };
  
  // 評価項目別の平均スコア
  averageScores: {
    usability: number;
    business_fit: number;
    performance: number;
    quality: number;
    content_richness: number;
  };
  
  // 評価項目別のスコア分布
  scoreDistribution: {
    [key: string]: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

function calculateStats(feedbacks: PilotFeedback[]): Stats {
  const scenes = {
    knowledge_registration: 0,
    search_reference: 0,
    share_utilization: 0,
    operation: 0,
  };

  const scoreSums = {
    usability: 0,
    business_fit: 0,
    performance: 0,
    quality: 0,
    content_richness: 0,
  };

  const scoreDistribution: Stats['scoreDistribution'] = {
    usability: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    business_fit: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    performance: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    quality: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    content_richness: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  let validCount = 0;

  for (const feedback of feedbacks) {
    // 利用シーン集計
    for (const scene of feedback.scenes) {
      if (scene in scenes) {
        scenes[scene as keyof typeof scenes]++;
      }
    }

    // 評価項目集計
    if (feedback.evaluations) {
      validCount++;
      for (const [key, evaluation] of Object.entries(feedback.evaluations)) {
        if (key in scoreSums && evaluation.score) {
          const score = evaluation.score;
          scoreSums[key as keyof typeof scoreSums] += score;
          if (key in scoreDistribution) {
            scoreDistribution[key][score as 1 | 2 | 3 | 4 | 5]++;
          }
        }
      }
    }
  }

  // 平均スコアを計算
  const averageScores = {
    usability: validCount > 0 ? scoreSums.usability / validCount : 0,
    business_fit: validCount > 0 ? scoreSums.business_fit / validCount : 0,
    performance: validCount > 0 ? scoreSums.performance / validCount : 0,
    quality: validCount > 0 ? scoreSums.quality / validCount : 0,
    content_richness: validCount > 0 ? scoreSums.content_richness / validCount : 0,
  };

  return {
    scenes,
    averageScores,
    scoreDistribution,
  };
}

