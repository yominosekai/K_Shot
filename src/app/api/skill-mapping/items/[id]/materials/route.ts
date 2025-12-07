// スキル項目の関連資料取得API

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { checkPermission } from '@/features/auth/utils';
import { getSkillPhaseItemMaterials } from '@/shared/lib/data-access/skill-mapping';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { getCategories } from '@/shared/lib/data-access/materials';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/skill-mapping/items/[id]/materials';

/**
 * GET /api/skill-mapping/items/:id/materials
 * スキル項目の関連資料を取得（教育訓練権限必須）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const skillPhaseItemId = parseInt(id, 10);

    if (isNaN(skillPhaseItemId)) {
      return NextResponse.json(
        { success: false, error: '無効なスキル項目IDです' },
        { status: 400 }
      );
    }

    // 関連付けを取得
    const relations = getSkillPhaseItemMaterials(skillPhaseItemId);

    // 資料の詳細情報を取得（パンくず情報含む）
    const materials = await Promise.all(
      relations.map(async (relation) => {
        const material = await getMaterialDetail(relation.materialId);
        if (!material) {
          return null;
        }

        // カテゴリ名を取得
        const categories = await getCategories();
        const category = categories.find((c) => c.id === material.category_id);

        // パンくずリストを構築
        const breadcrumbs: string[] = [];
        if (category) {
          breadcrumbs.push(category.name);
        }
        if (material.folder_path) {
          const pathParts = material.folder_path.split('/').filter((p) => p);
          breadcrumbs.push(...pathParts);
        }
        breadcrumbs.push(material.title);

        return {
          id: material.id,
          title: material.title,
          description: material.description,
          type: material.type,
          category_name: category?.name || '',
          folder_path: material.folder_path,
          breadcrumbs,
          displayOrder: relation.displayOrder,
        };
      })
    );

    const validMaterials = materials.filter((m) => m !== null);

    debug(MODULE_NAME, `関連資料取得: itemId=${skillPhaseItemId}, ${validMaterials.length}件`);

    return NextResponse.json({
      success: true,
      materials: validMaterials,
    });
  } catch (err) {
    error(MODULE_NAME, '関連資料取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '関連資料の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

