// 資料パス管理フック

import { useCallback, useState, useEffect } from 'react';
import type { FolderNormalized, MaterialNormalized } from '@/features/materials/types';

/**
 * 相対パスを構築する関数（クライアント側では相対パスのみ）
 */
export function useMaterialPathManager() {
  const [driveLetter, setDriveLetter] = useState<string | null>(null);

  // ドライブ設定を取得
  useEffect(() => {
    const fetchDriveConfig = async () => {
      try {
        const response = await fetch('/api/setup/check');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config?.driveLetter) {
            setDriveLetter(data.config.driveLetter);
          }
        }
      } catch (err) {
        console.error('ドライブ設定取得エラー:', err);
      }
    };
    fetchDriveConfig();
  }, []);

  const buildRelativePath = useCallback(
    (folder?: FolderNormalized, material?: MaterialNormalized): string => {
      let relativePath = '';
      
      if (material) {
        if (material.folder_path && material.folder_path.trim() !== '') {
          relativePath = `shared/shared_materials/folders/${material.folder_path}/material_${material.id}`;
        } else {
          relativePath = `shared/shared_materials/uncategorized/material_${material.id}`;
        }
      } else if (folder) {
        if (folder.path && folder.path.trim() !== '') {
          relativePath = `shared/shared_materials/folders/${folder.path}`;
        } else {
          relativePath = `shared/shared_materials/folders/${folder.name}`;
        }
      }

      // ドライブレターが取得できている場合は完全なパスを返す
      if (relativePath && driveLetter) {
        // スラッシュをバックスラッシュに変換（Windowsパス形式に統一）
        const normalizedPath = relativePath.replace(/\//g, '\\');
        return `${driveLetter}:\\k_shot\\${normalizedPath}`;
      }

      return relativePath;
    },
    [driveLetter]
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


