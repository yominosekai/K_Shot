// 共有資料API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getMaterials, getCategories } from '@/shared/lib/data-access/materials';
import { requireAuth } from '@/shared/lib/auth/middleware';
import type { MaterialFilter } from '@/features/materials/types';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials';

/**
 * GET /api/materials
 * 共有資料一覧を取得（認証必須）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータからフィルターを構築
    const filter: MaterialFilter = {};

    if (searchParams.get('search')) {
      filter.search = searchParams.get('search') || undefined;
    }

    if (searchParams.get('category_id')) {
      filter.category_id = searchParams.get('category_id') || undefined;
    }

    if (searchParams.get('type')) {
      filter.type = searchParams.get('type') as MaterialFilter['type'];
    }

    if (searchParams.get('tags')) {
      filter.tags = searchParams.get('tags')?.split(',').filter((t) => t) || undefined;
    }

    if (searchParams.get('created_by')) {
      filter.created_by = searchParams.get('created_by') || undefined;
    }

    if (searchParams.get('is_published')) {
      filter.is_published = searchParams.get('is_published') === 'true';
    }

    if (searchParams.get('sort_by')) {
      filter.sort_by = searchParams.get('sort_by') as MaterialFilter['sort_by'];
    }

    if (searchParams.get('sort_order')) {
      filter.sort_order = searchParams.get('sort_order') as MaterialFilter['sort_order'];
    }

    if (searchParams.get('limit')) {
      filter.limit = parseInt(searchParams.get('limit') || '50', 10);
    }

    if (searchParams.get('offset')) {
      filter.offset = parseInt(searchParams.get('offset') || '0', 10);
    }

    // 差分更新用：sinceパラメータ
    if (searchParams.get('since')) {
      filter.since = searchParams.get('since') || undefined;
    }

    // お気に入り数を含めるかどうか
    if (searchParams.get('include_bookmark_counts') === 'true') {
      filter.include_bookmark_counts = true;
    }

    // いいね状態を取得するためにuser_idを追加
    if (authResult.user?.id) {
      filter.user_id = authResult.user.id;
    }

    const materials = await getMaterials(filter);

    return NextResponse.json({
      success: true,
      materials,
      count: materials.length,
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    
    // ドライブ設定が完了していない場合のエラーハンドリング
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Drive configuration not completed',
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: '資料の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

