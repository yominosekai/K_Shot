// 資料ランキングAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { debug, info } from '@/shared/lib/logger';

const MODULE_NAME = 'api/analytics/rankings';

// ランキングキャッシュ（サーバー側メモリキャッシュ、TTL方式）
const rankingCache = new Map<string, {
  data: RankingItem[];
  timestamp: number;
}>();

const CACHE_TTL = 30 * 60 * 1000; // 30分

interface RankingItem {
  materialId: string;
  title: string;
  count: number;
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
}

/**
 * GET /api/analytics/rankings
 * 資料ランキングを取得（いいね、閲覧数）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'likes'; // likes, views
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const forceRefresh = searchParams.get('force_refresh') === 'true'; // キャッシュを無効化して強制更新

    // キャッシュキー
    const cacheKey = `rankings:${type}:${limit}`;

    // キャッシュチェック（force_refreshがfalseの場合のみ）
    if (!forceRefresh) {
      const cached = rankingCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        debug(MODULE_NAME, `キャッシュを返します: ${cacheKey} (残り${Math.round((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000 / 60)}分)`);
        return NextResponse.json({
          success: true,
          type,
          rankings: cached.data,
          cached: true,
        });
      }
    }

    // キャッシュが期限切れまたはforce_refreshの場合、集計処理を実行
    debug(MODULE_NAME, `集計処理を実行します: ${cacheKey}${forceRefresh ? ' (強制更新)' : ''}`);

    const db = getDatabase();
    let rankings: RankingItem[] = [];

    if (type === 'likes') {
      // いいね数ランキング（material_likesテーブルから集計）
      const query = db.prepare(`
        SELECT 
          m.id,
          m.title,
          m.created_by,
          COUNT(ml.material_id) as count
        FROM materials m
        LEFT JOIN material_likes ml ON m.id = ml.material_id
        WHERE m.is_published = 1
        GROUP BY m.id, m.title, m.created_by
        ORDER BY count DESC, m.created_date DESC
        LIMIT ?
      `);

      const results = query.all(limit) as Array<{
        id: string;
        title: string;
        created_by: string;
        count: number;
      }>;

      // 作成者情報を一括取得
      const creatorIds = [...new Set(results.map(r => r.created_by))];
      if (creatorIds.length > 0) {
        const placeholders = creatorIds.map(() => '?').join(',');
        const creators = db.prepare(`
          SELECT id, display_name, avatar FROM users 
          WHERE id IN (${placeholders})
        `).all(...creatorIds) as Array<{
          id: string;
          display_name: string;
          avatar: string | null;
        }>;

        const creatorMap = new Map(
          creators.map(c => [c.id, c])
        );

        debug(MODULE_NAME, `作成者情報一括取得完了: ${results.length}件中${creatorIds.length}人の作成者`);

        for (const result of results) {
          const creator = creatorMap.get(result.created_by);
          rankings.push({
            materialId: result.id,
            title: result.title,
            count: result.count,
            createdBy: result.created_by,
            createdByName: creator?.display_name,
            createdByAvatar: creator?.avatar || undefined,
          });
        }
      } else {
        // 作成者がいない場合（通常は発生しない）
        for (const result of results) {
          rankings.push({
            materialId: result.id,
            title: result.title,
            count: result.count,
            createdBy: result.created_by,
          });
        }
      }
    } else if (type === 'views') {
      // 閲覧数ランキング（materialsテーブルのviewsカラム）
      const query = db.prepare(`
        SELECT 
          id,
          title,
          created_by,
          views as count
        FROM materials
        WHERE is_published = 1
        ORDER BY views DESC, created_date DESC
        LIMIT ?
      `);

      const results = query.all(limit) as Array<{
        id: string;
        title: string;
        created_by: string;
        count: number;
      }>;

      // 作成者情報を一括取得
      const creatorIds = [...new Set(results.map(r => r.created_by))];
      if (creatorIds.length > 0) {
        const placeholders = creatorIds.map(() => '?').join(',');
        const creators = db.prepare(`
          SELECT id, display_name, avatar FROM users 
          WHERE id IN (${placeholders})
        `).all(...creatorIds) as Array<{
          id: string;
          display_name: string;
          avatar: string | null;
        }>;

        const creatorMap = new Map(
          creators.map(c => [c.id, c])
        );

        debug(MODULE_NAME, `作成者情報一括取得完了: ${results.length}件中${creatorIds.length}人の作成者`);

        for (const result of results) {
          const creator = creatorMap.get(result.created_by);
          rankings.push({
            materialId: result.id,
            title: result.title,
            count: result.count,
            createdBy: result.created_by,
            createdByName: creator?.display_name,
            createdByAvatar: creator?.avatar || undefined,
          });
        }
      } else {
        // 作成者がいない場合（通常は発生しない）
        for (const result of results) {
          rankings.push({
            materialId: result.id,
            title: result.title,
            count: result.count,
            createdBy: result.created_by,
          });
        }
      }
    }

    // キャッシュに保存
    rankingCache.set(cacheKey, {
      data: rankings,
      timestamp: Date.now(),
    });

    debug(MODULE_NAME, `ランキング集計完了: ${cacheKey} (${rankings.length}件)`);

    return NextResponse.json({
      success: true,
      type,
      rankings,
      cached: false,
    });
  } catch (err) {
    console.error('[API] /api/analytics/rankings GET エラー:', err);
    return NextResponse.json(
      { success: false, error: 'ランキングデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}

