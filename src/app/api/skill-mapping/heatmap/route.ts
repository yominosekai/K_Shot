// スキルマッピングヒートマップAPI

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { checkPermission } from '@/features/auth/utils';
import { getSkillPhaseItems } from '@/shared/lib/data-access/skill-mapping';
import { getUsersList } from '@/shared/lib/data-access/users';
import { getUserProgress } from '@/shared/lib/data-access/skill-mapping';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/heatmap';

/**
 * GET /api/skill-mapping/heatmap
 * ヒートマップ用データを取得（教育訓練権限必須）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    // 教育訓練権限チェック
    if (!checkPermission(authResult.user, 'training')) {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      );
    }

    // スキルマスタを取得
    const items = getSkillPhaseItems();
    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        users: [],
        categories: [],
      });
    }

    // ファイルベースからヒートマップデータを取得
    const heatMapData = await getHeatMapDataFromFiles(items);

    // ユーザー一覧を取得
    const users = await getUsersList();
    const activeUsers = users.filter(u => u.is_active);

    // 大分類のリストを取得
    const categories = Array.from(new Set(items.map(item => item.category)));

    debug(MODULE_NAME, `ヒートマップデータ取得: ${activeUsers.length}ユーザー, ${categories.length}大分類`);

    return NextResponse.json({
      success: true,
      data: heatMapData,
      users: activeUsers.map(u => ({
        id: u.id,
        display_name: u.display_name,
        department: u.department,
      })),
      categories,
    });
  } catch (err) {
    error(MODULE_NAME, 'ヒートマップデータ取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ヒートマップデータの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * ファイルベースからヒートマップデータを取得
 */
async function getHeatMapDataFromFiles(
  items: Array<{ id: number; category: string; phase: number }>
): Promise<Array<{
  userId: string;
  category: string;
  maxPhase: number;
  phaseBreakdown: Record<number, number>;
}>> {
  const users = await getUsersList();
  const activeUsers = users.filter(u => u.is_active);
  const categories = Array.from(new Set(items.map(item => item.category)));

  const result: Array<{
    userId: string;
    category: string;
    maxPhase: number;
    phaseBreakdown: Record<number, number>;
  }> = [];

  // 各ユーザーの進捗データを取得
  for (const user of activeUsers) {
    const progress = await getUserProgress(user.id);
    const progressMap = new Map(progress.map(p => [p.skillPhaseItemId, p]));

    // 各大分類について集計
    for (const category of categories) {
      const categoryItems = items.filter(item => item.category === category);
      let maxPhase = 0;
      const phaseBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const item of categoryItems) {
        const progressItem = progressMap.get(item.id);
        if (progressItem?.status === 'completed') {
          const phase = item.phase;
          if (phase > maxPhase) {
            maxPhase = phase;
          }
          phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
        }
      }

      result.push({
        userId: user.id,
        category,
        maxPhase,
        phaseBreakdown,
      });
    }
  }

  return result;
}

