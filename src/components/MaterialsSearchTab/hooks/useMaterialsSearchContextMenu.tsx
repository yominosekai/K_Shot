// 資料検索のコンテキストメニュー処理フック

'use client';

import { useCallback, useState } from 'react';
import { Download, FileEdit, Copy, Move, Info, Trash2, RefreshCw, Bell, Link } from 'lucide-react';
import type { MaterialNormalized } from '@/features/materials/types';
import type { ContextMenuItem } from '@/components/ContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { checkPermission } from '@/features/auth/utils';

interface UseMaterialsSearchContextMenuProps {
  onRefresh?: () => Promise<void>;
  onMoveMaterial?: (material: MaterialNormalized) => void;
  onShowMaterialInfo?: (material: MaterialNormalized) => void;
  onSendNotification?: (material: MaterialNormalized) => void;
  onDownloadMaterial?: (material: MaterialNormalized) => Promise<void>;
  onEditMaterial?: (material: MaterialNormalized) => void;
  onMoveToTrash?: (material: MaterialNormalized) => Promise<void>;
  onLinkToSkillMapping?: (material: MaterialNormalized) => void;
  showToast: (message: string) => void;
}

export function useMaterialsSearchContextMenu({
  onRefresh,
  onMoveMaterial,
  onShowMaterialInfo,
  onSendNotification,
  onDownloadMaterial,
  onEditMaterial,
  onMoveToTrash,
  onLinkToSkillMapping,
  showToast,
}: UseMaterialsSearchContextMenuProps) {
  const { user } = useAuth();
  const hasTrainingPermission = checkPermission(user, 'training');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  // 背景エリアの右クリック処理
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
          onClick: async () => {
            if (onRefresh) {
              try {
                await onRefresh();
                showToast('情報を更新しました');
              } catch (err) {
                console.error('更新エラー:', err);
                showToast('更新に失敗しました');
              }
            }
          },
        },
      ];

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [onRefresh, showToast]
  );

  // 右クリックメニューの処理（資料アイテム用）
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, material: MaterialNormalized) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          label: 'ダウンロード',
          icon: <Download className="w-4 h-4" />,
          onClick: async () => {
            if (onDownloadMaterial) {
              await onDownloadMaterial(material);
            }
          },
        },
        {
          label: '編集',
          icon: <FileEdit className="w-4 h-4" />,
          onClick: () => {
            if (onEditMaterial) {
              onEditMaterial(material);
            }
          },
        },
        {
          label: 'リンクをコピー',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => {
            // TODO: リンクコピー機能を実装
            console.log('リンクをコピー:', material);
          },
        },
        {
          label: '移動',
          icon: <Move className="w-4 h-4" />,
          onClick: async () => {
            if (onMoveMaterial) {
              onMoveMaterial(material);
            }
          },
        },
        {
          label: 'ファイル情報',
          icon: <Info className="w-4 h-4" />,
          onClick: async () => {
            if (onShowMaterialInfo) {
              onShowMaterialInfo(material);
            }
          },
        },
        {
          label: '通知',
          icon: <Bell className="w-4 h-4" />,
          onClick: () => {
            if (onSendNotification) {
              onSendNotification(material);
            }
          },
        },
      ];

      // 教育訓練権限以上の場合のみ「スキルマップに関連付け」を追加
      if (hasTrainingPermission && onLinkToSkillMapping) {
        items.push({
          label: 'スキルマップに関連付け',
          icon: <Link className="w-4 h-4" />,
          onClick: () => onLinkToSkillMapping(material),
        });
      }

      items.push({
        label: 'ゴミ箱に移動',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: async () => {
          if (onMoveToTrash) {
            await onMoveToTrash(material);
          }
        },
        danger: true,
      });

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [onDownloadMaterial, onMoveMaterial, onShowMaterialInfo, onSendNotification, onEditMaterial, onMoveToTrash, hasTrainingPermission, onLinkToSkillMapping]
  );

  return {
    contextMenu,
    setContextMenu,
    handleBackgroundContextMenu,
    handleContextMenu,
  };
}


