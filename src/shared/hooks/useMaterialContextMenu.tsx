// 資料・フォルダのコンテキストメニュー管理フック

'use client';

import { useCallback } from 'react';
import { Download, FileEdit, Copy, Move, Info, Bell, Trash2, Edit, Plus, FolderPlus } from 'lucide-react';
import type { ContextMenuItem } from '@/components/ContextMenu';
import type { MaterialNormalized, FolderNormalized } from '@/features/materials/types';

interface UseMaterialContextMenuProps {
  currentPath: string;
  userId?: string;
  copyPath: (folder?: FolderNormalized, material?: MaterialNormalized) => Promise<void>;
  moveMaterialToTrash: (material: MaterialNormalized) => void;
  moveFolderToTrash: (folder: FolderNormalized) => void;
  onCreateMaterial?: (folderPath: string) => void;
  onCreateFolder?: (currentPath: string) => void;
  onEditMaterial: (material: MaterialNormalized) => void;
  onMoveMaterial: (material: MaterialNormalized) => void;
  onShowMaterialInfo: (material: MaterialNormalized) => void;
  onShowFolderProperties: (folder: FolderNormalized) => void;
  onSendNotification: (material: MaterialNormalized) => void;
  onDownloadMaterial: (material: MaterialNormalized) => Promise<void>;
  onRenameFolder: (folder: FolderNormalized) => void;
  onMoveFolder: (folder: FolderNormalized) => void;
  showToast: (message: string) => void;
}

export function useMaterialContextMenu({
  currentPath,
  userId,
  copyPath,
  moveMaterialToTrash,
  moveFolderToTrash,
  onCreateMaterial,
  onCreateFolder,
  onEditMaterial,
  onMoveMaterial,
  onShowMaterialInfo,
    onShowFolderProperties,
    onSendNotification,
    onDownloadMaterial,
    onRenameFolder,
    onMoveFolder,
    showToast,
}: UseMaterialContextMenuProps) {
  const createMaterialMenuItems = useCallback(
    (material: MaterialNormalized): ContextMenuItem[] => {
      return [
        {
          label: 'ダウンロード',
          icon: <Download className="w-4 h-4" />,
          onClick: () => onDownloadMaterial(material),
        },
        {
          label: '編集',
          icon: <FileEdit className="w-4 h-4" />,
          onClick: () => onEditMaterial(material),
        },
        {
          label: 'リンクをコピー',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => copyPath(undefined, material),
        },
        {
          label: '移動',
          icon: <Move className="w-4 h-4" />,
          onClick: () => onMoveMaterial(material),
        },
        {
          label: 'ファイル情報',
          icon: <Info className="w-4 h-4" />,
          onClick: () => onShowMaterialInfo(material),
        },
        {
          label: '通知',
          icon: <Bell className="w-4 h-4" />,
          onClick: () => onSendNotification(material),
        },
        {
          label: 'ゴミ箱に移動',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => moveMaterialToTrash(material),
          danger: true,
        },
      ];
    },
    [
      copyPath,
      moveMaterialToTrash,
      onEditMaterial,
      onMoveMaterial,
      onShowMaterialInfo,
      onSendNotification,
      onDownloadMaterial,
    ]
  );

  const createFolderMenuItems = useCallback(
    (folder: FolderNormalized): ContextMenuItem[] => {
      return [
        {
          label: 'フォルダ名を変更',
          icon: <Edit className="w-4 h-4" />,
          onClick: () => {
            onRenameFolder(folder);
          },
        },
        {
          label: 'リンクをコピー',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => copyPath(folder, undefined),
        },
        {
          label: '移動',
          icon: <Move className="w-4 h-4" />,
          onClick: () => {
            onMoveFolder(folder);
          },
        },
        {
          label: 'ファイル情報',
          icon: <Info className="w-4 h-4" />,
          onClick: () => onShowFolderProperties(folder),
        },
        {
          label: 'ゴミ箱に移動',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => moveFolderToTrash(folder),
          danger: true,
        },
      ];
    },
    [copyPath, moveFolderToTrash, onShowFolderProperties, onRenameFolder, onMoveFolder]
  );

  const createEmptyAreaMenuItems = useCallback((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];
    if (onCreateMaterial) {
      items.push({
        label: '新規資料作成',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => onCreateMaterial(currentPath),
      });
    }
    if (onCreateFolder) {
      items.push({
        label: '新規フォルダ作成',
        icon: <FolderPlus className="w-4 h-4" />,
        onClick: () => onCreateFolder(currentPath),
      });
    }
    return items;
  }, [currentPath, onCreateMaterial, onCreateFolder]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, folder?: FolderNormalized, material?: MaterialNormalized) => {
      e.preventDefault();
      e.stopPropagation();

      let items: ContextMenuItem[] = [];

      if (material) {
        items = createMaterialMenuItems(material);
      } else if (folder) {
        items = createFolderMenuItems(folder);
      } else {
        items = createEmptyAreaMenuItems();
      }

      return {
        x: e.clientX,
        y: e.clientY,
        items,
      };
    },
    [createMaterialMenuItems, createFolderMenuItems, createEmptyAreaMenuItems]
  );

  return {
    handleContextMenu,
  };
}

