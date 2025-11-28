// 最近の共有資料API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getMaterials } from '@/shared/lib/data-access/materials';
import type { MaterialFilter } from '@/features/materials/types';

const MODULE_NAME = 'api/materials/recent';

/**
 * GET /api/materials/recent
 * 最近の共有資料（新規作成・更新）を取得（最新10件）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 最新の資料を取得（updated_dateでソート）
    const filter: MaterialFilter = {
      sort_by: 'updated_date',
      sort_order: 'desc',
      limit,
    };

    const materials = await getMaterials(filter);

    // 作成と更新を区別するために、created_dateとupdated_dateを比較
    const recentActivities = materials.map((material) => {
      const createdDate = new Date(material.created_date).getTime();
      const updatedDate = new Date(material.updated_date).getTime();
      
      // 更新日時が作成日時から1分以上経過していれば「更新」、そうでなければ「新規作成」
      const isUpdate = updatedDate - createdDate > 60000; // 1分 = 60000ミリ秒

      return {
        id: material.id,
        title: material.title,
        type: isUpdate ? 'update' : 'create',
        created_by: material.created_by,
        created_by_name: material.created_by_name,
        created_date: material.created_date,
        updated_date: material.updated_date,
        folder_path: material.folder_path,
      };
    });

    return NextResponse.json({
      success: true,
      activities: recentActivities,
      count: recentActivities.length,
    });
  } catch (err) {
    console.error('[API] /api/materials/recent GET エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '最近の資料の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

