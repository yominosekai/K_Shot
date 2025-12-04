// お気に入りページのコンテキストメニュー管理フック

'use client';

import React, { useCallback, useState } from 'react';
import { Download, Info, Bell, FileEdit, Copy, RefreshCw, Trash2 } from 'lucide-react';
import type { ContextMenuItem } from '@/components/ContextMenu';
import type { MaterialNormalized } from '@/features/materials/types';
import { downloadMaterialAsZip } from '@/shared/lib/utils/material-download';

interface UseFavoritesContextMenuProps {
  showToast: (message: string) => void;
  onEditMaterial: (material: MaterialNormalized) => void;
  onShowInfo: (material: MaterialNormalized) => void;
  onSendNotification: (material: MaterialNormalized) => void;
  onRefresh: () => void;
  onCleanup: () => void;
}

export function useFavoritesContextMenu({
  showToast,
  onEditMaterial,
  onShowInfo,
  onSendNotification,
  onRefresh,
  onCleanup,
}: UseFavoritesContextMenuProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  // 資料のパスをコピーする処理
  const copyMaterialPath = useCallback(async (material: MaterialNormalized) => {
    try {
      // ドライブ設定を取得
      const response = await fetch('/api/setup/check');
      let driveLetter: string | null = null;
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config?.driveLetter) {
          driveLetter = data.config.driveLetter;
        }
      }

      // パスを構築
      let relativePath = '';
      if (material.folder_path && material.folder_path.trim() !== '') {
        relativePath = `shared/shared_materials/folders/${material.folder_path}/material_${material.id}`;
      } else {
        relativePath = `shared/shared_materials/uncategorized/material_${material.id}`;
      }

      // スラッシュをバックスラッシュに変換（Windowsパス形式に統一）
      relativePath = relativePath.replace(/\//g, '\\');

      // ドライブレターが取得できている場合は完全なパスを返す
      const fullPath = driveLetter ? `${driveLetter}:\\k_shot\\${relativePath}` : relativePath;

      await navigator.clipboard.writeText(fullPath);
      showToast('パスをコピーしました');
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
      try {
        // フォールバック: ドライブ設定を取得してパスを構築
        const response = await fetch('/api/setup/check');
        let driveLetter: string | null = null;
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config?.driveLetter) {
            driveLetter = data.config.driveLetter;
          }
        }

        let relativePath = '';
        if (material.folder_path && material.folder_path.trim() !== '') {
          relativePath = `shared/shared_materials/folders/${material.folder_path}/material_${material.id}`;
        } else {
          relativePath = `shared/shared_materials/uncategorized/material_${material.id}`;
        }

        // スラッシュをバックスラッシュに変換（Windowsパス形式に統一）
        relativePath = relativePath.replace(/\//g, '\\');

        const fullPath = driveLetter ? `${driveLetter}:\\k_shot\\${relativePath}` : relativePath;

        const textArea = document.createElement('textarea');
        textArea.value = fullPath;
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
  }, [showToast]);

  // 資料アイテムの右クリックメニューの処理
  const handleMaterialContextMenu = useCallback(
    (e: React.MouseEvent, material: MaterialNormalized) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          label: 'ダウンロード',
          icon: <Download className="w-4 h-4" />,
          onClick: async () => {
            try {
              await downloadMaterialAsZip(material.id);
              showToast('ダウンロードを開始しました');
            } catch (err) {
              console.error('ダウンロードエラー:', err);
              showToast(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
            }
          },
        },
        {
          label: '編集',
          icon: <FileEdit className="w-4 h-4" />,
          onClick: async () => {
            try {
              // 詳細情報を取得
              const response = await fetch(`/api/materials/${material.id}`);
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.material) {
                  onEditMaterial(data.material);
                  return;
                }
              }
              // 詳細取得に失敗した場合は基本情報のみで編集
              onEditMaterial(material);
            } catch (err) {
              console.error('資料詳細取得エラー:', err);
              // エラーが発生した場合は基本情報のみで編集
              onEditMaterial(material);
            }
          },
        },
        {
          label: 'リンクをコピー',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => copyMaterialPath(material),
        },
        {
          label: 'ファイル情報',
          icon: <Info className="w-4 h-4" />,
          onClick: async () => {
            try {
              // 詳細情報を取得
              const response = await fetch(`/api/materials/${material.id}`);
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.material) {
                  // 既存のmaterialオブジェクトの統計情報（views, likes）を保持
                  onShowInfo({
                    ...data.material,
                    views: material.views ?? data.material.views ?? 0,
                    likes: material.likes ?? data.material.likes ?? 0,
                  });
                  return;
                }
              }
              // 詳細取得に失敗した場合は基本情報のみで表示
              onShowInfo(material);
            } catch (err) {
              console.error('資料詳細取得エラー:', err);
              // エラーが発生した場合は基本情報のみで表示
              onShowInfo(material);
            }
          },
        },
        {
          label: '通知',
          icon: <Bell className="w-4 h-4" />,
          onClick: () => {
            onSendNotification(material);
          },
        },
      ];

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [showToast, onEditMaterial, onShowInfo, onSendNotification, copyMaterialPath]
  );

  // 背景の右クリックメニューの処理
  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // 資料カード/リストアイテムの上でない場合のみ処理
      const target = e.target as HTMLElement;
      if (target.closest('[data-material-item]')) {
        return; // 資料アイテムの上なので無視
      }

      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          label: '最新の情報に更新',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: onRefresh,
        },
        {
          label: '存在しない資料をチェック',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: onCleanup,
        },
      ];

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [onRefresh, onCleanup]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    handleMaterialContextMenu,
    handleBackgroundContextMenu,
    closeContextMenu,
  };
}
