// 資料パス管理フック

import { useCallback } from 'react';
import type { FolderNormalized, MaterialNormalized } from '@/features/materials/types';

/**
 * 相対パスを構築する関数（クライアント側では相対パスのみ）
 */
export function useMaterialPathManager() {
  const buildRelativePath = useCallback(
    (folder?: FolderNormalized, material?: MaterialNormalized): string => {
      if (material) {
        if (material.folder_path && material.folder_path.trim() !== '') {
          return `shared/shared_materials/folders/${material.folder_path}/material_${material.id}`;
        } else {
          return `shared/shared_materials/uncategorized/material_${material.id}`;
        }
      } else if (folder) {
        if (folder.path && folder.path.trim() !== '') {
          return `shared/shared_materials/folders/${folder.path}`;
        } else {
          return `shared/shared_materials/folders/${folder.name}`;
        }
      }

      return '';
    },
    []
  );

  // パスをコピーする関数（相対パスのみ）
  const copyPath = useCallback(
    async (
      folder: FolderNormalized | undefined,
      material: MaterialNormalized | undefined,
      showToast: (message: string) => void
    ) => {
      const relativePath = buildRelativePath(folder, material);

      if (!relativePath) {
        console.error('パスの構築に失敗しました');
        return;
      }

      try {
        await navigator.clipboard.writeText(relativePath);
        showToast('パスをコピーしました');
      } catch (err) {
        console.error('クリップボードへのコピーに失敗しました:', err);
        try {
          const textArea = document.createElement('textarea');
          textArea.value = relativePath;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showToast('パスをコピーしました');
        } catch (fallbackErr) {
          console.error('フォールバックコピーも失敗:', fallbackErr);
        }
      }
    },
    [buildRelativePath]
  );

  return {
    buildRelativePath,
    copyPath,
  };
}


