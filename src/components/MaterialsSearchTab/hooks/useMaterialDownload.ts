// 資料ダウンロード処理フック

import { useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';

export function useMaterialDownload(showToast: (message: string) => void) {
  const downloadMaterial = useCallback(
    async (material: MaterialNormalized) => {
      try {
        // ZIPファイルとしてダウンロード
        const response = await fetch(`/api/materials/${material.id}/download-zip`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'ダウンロードに失敗しました');
        }

        // レスポンスからファイル名を取得
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `material_${material.id}.zip`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
          if (fileNameMatch) {
            fileName = decodeURIComponent(fileNameMatch[1]);
          }
        }

        // Blobとして取得してダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('ダウンロードを開始しました');
      } catch (err) {
        console.error('ダウンロードエラー:', err);
        showToast(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
      }
    },
    [showToast]
  );

  return { downloadMaterial };
}


