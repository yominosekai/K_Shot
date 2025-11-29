// 検索候補API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getMaterials } from '@/shared/lib/data-access/materials';
import { searchUsers } from '@/shared/lib/data-access/users';
import type { MaterialFilter } from '@/features/materials/types';

const MODULE_NAME = 'api/search/suggestions';

/**
 * GET /api/search/suggestions
 * 検索候補を取得（資料とメンバー）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        materials: [],
        users: [],
      });
    }

    // 資料の検索候補を取得
    const materialFilter: MaterialFilter = {
      search: query,
      limit,
      sort_by: 'updated_date',
      sort_order: 'desc',
    };
    const materials = await getMaterials(materialFilter);

    // メンバーの検索候補を取得（DBクエリで直接検索）
    const matchedUsers = await searchUsers(query, limit);

    return NextResponse.json({
      success: true,
      materials: materials.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        folder_path: m.folder_path,
      })),
      users: matchedUsers.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        username: u.username,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (err) {
    console.error('[API] /api/search/suggestions GET エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '検索候補の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

