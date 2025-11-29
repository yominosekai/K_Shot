// 資料詳細取得フック

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { MaterialNormalized } from '@/features/materials/types';

export function useMaterialDetail() {
  const { user } = useAuth();

  // 資料詳細を取得（閲覧数カウント用にuser_idを渡す）
  const fetchMaterialDetail = useCallback(
    async (materialId: string): Promise<MaterialNormalized | null> => {
      try {
        const url = user?.id
          ? `/api/materials/${materialId}?user_id=${user.id}`
          : `/api/materials/${materialId}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('資料の詳細取得に失敗しました');
        }

        const data = await response.json();
        if (data.success && data.material) {
          return data.material;
        }
        return null;
      } catch (err) {
        console.error('資料詳細取得エラー:', err);
        return null;
      }
    },
    [user?.id]
  );

  return {
    fetchMaterialDetail,
  };
}

