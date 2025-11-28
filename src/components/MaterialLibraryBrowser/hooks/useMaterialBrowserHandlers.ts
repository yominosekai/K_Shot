// 階層ブラウザのハンドラー管理フック

import { useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';
import { downloadMaterialAsZip } from '@/shared/lib/utils/material-download';

interface UseMaterialBrowserHandlersProps {
  userSid?: string;
  onMaterialClick: (material: MaterialNormalized) => void;
  showToast: (message: string) => void;
}

export function useMaterialBrowserHandlers({
  userSid,
  onMaterialClick,
  showToast,
}: UseMaterialBrowserHandlersProps) {
  // 資料クリック処理
  const handleMaterialClick = useCallback(
    async (material: MaterialNormalized) => {
      try {
        // 閲覧数カウント用にuser_sidをクエリパラメータとして渡す
        const url = userSid
          ? `/api/materials/${material.id}?user_sid=${userSid}`
          : `/api/materials/${material.id}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.material) {
            onMaterialClick(data.material);
            return;
          }
        }
      } catch (err) {
        console.error('資料詳細取得エラー:', err);
      }
      onMaterialClick(material);
    },
    [userSid, onMaterialClick]
  );

  // ダウンロード処理
  const handleDownloadMaterial = useCallback(
    async (material: MaterialNormalized) => {
      try {
        await downloadMaterialAsZip(material.id);
        showToast('ダウンロードを開始しました');
      } catch (err) {
        console.error('ダウンロードエラー:', err);
        showToast(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
      }
    },
    [showToast]
  );

  return {
    handleMaterialClick,
    handleDownloadMaterial,
  };
}

