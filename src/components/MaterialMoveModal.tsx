// 資料移動モーダルコンポーネント

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Folder, ChevronRight, ChevronDown, Check } from 'lucide-react';
import type { MaterialNormalized, FolderNormalized } from '@/features/materials/types';

interface MaterialMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: MaterialNormalized | null;
  onMove: (materialId: string, targetFolderPath: string) => Promise<void>;
  currentFolderPath?: string;
}

interface FolderTreeNode {
  folder: FolderNormalized;
  children: FolderTreeNode[];
  isExpanded: boolean;
}

export default function MaterialMoveModal({
  isOpen,
  onClose,
  material,
  onMove,
  currentFolderPath = '',
}: MaterialMoveModalProps) {
  const [folders, setFolders] = useState<FolderNormalized[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // フォルダ一覧を取得
  useEffect(() => {
    if (isOpen) {
      const fetchFolders = async () => {
        try {
          const response = await fetch('/api/materials/folders?flat=true');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setFolders(data.folders || []);
            }
          }
        } catch (err) {
          console.error('フォルダ取得エラー:', err);
        }
      };
      fetchFolders();
      // 現在のフォルダパスを展開
      if (currentFolderPath) {
        const pathParts = currentFolderPath.split('/');
        const pathsToExpand = new Set<string>();
        let currentPath = '';
        for (const part of pathParts) {
          if (currentPath) {
            currentPath += '/' + part;
          } else {
            currentPath = part;
          }
          pathsToExpand.add(currentPath);
        }
        setExpandedPaths(pathsToExpand);
      }
    }
  }, [isOpen, currentFolderPath]);

  // フォルダツリーを構築
  const buildFolderTree = useCallback((): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // すべてのフォルダをノードに変換
    folders.forEach((folder) => {
      folderMap.set(folder.path || folder.name, {
        folder,
        children: [],
        isExpanded: expandedPaths.has(folder.path || folder.name),
      });
    });

    // 親子関係を構築
    folders.forEach((folder) => {
      const node = folderMap.get(folder.path || folder.name);
      if (!node) return;

      if (!folder.path || folder.path === folder.name) {
        // ルートフォルダ
        rootFolders.push(node);
      } else {
        // 親フォルダを探す
        const pathParts = folder.path.split('/');
        if (pathParts.length > 1) {
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentNode = folderMap.get(parentPath);
          if (parentNode) {
            parentNode.children.push(node);
          } else {
            // 親が見つからない場合はルートに追加
            rootFolders.push(node);
          }
        } else {
          rootFolders.push(node);
        }
      }
    });

    // ソート（名前順）
    const sortTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
      return nodes
        .sort((a, b) => a.folder.name.localeCompare(b.folder.name, 'ja'))
        .map((node) => ({
          ...node,
          children: sortTree(node.children),
        }));
    };

    return sortTree(rootFolders);
  }, [folders, expandedPaths]);

  // フォルダノードの展開/折りたたみ
  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // フォルダノードをレンダリング
  const renderFolderNode = useCallback(
    (node: FolderTreeNode, level: number = 0) => {
      const path = node.folder.path || node.folder.name;
      const isSelected = selectedFolderPath === path;
      const hasChildren = node.children.length > 0;

      return (
        <div key={path}>
          <div
            className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
            style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
            onClick={() => setSelectedFolderPath(path)}
          >
            {/* 展開/折りたたみアイコン */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(path);
                }}
                className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {node.isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2" />
            )}

            {/* フォルダアイコン */}
            <Folder className="w-4 h-4 mr-2 flex-shrink-0" />

            {/* フォルダ名 */}
            <span className="flex-1 truncate">{node.folder.name}</span>

            {/* 選択マーク */}
            {isSelected && (
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            )}
          </div>

          {/* 子フォルダ */}
          {hasChildren && node.isExpanded && (
            <div>{node.children.map((child) => renderFolderNode(child, level + 1))}</div>
          )}
        </div>
      );
    },
    [selectedFolderPath, toggleExpand]
  );

  // 移動実行
  const handleMove = useCallback(async () => {
    if (!material || isMoving) return;

    setIsMoving(true);
    try {
      await onMove(material.id, selectedFolderPath);
      onClose();
    } catch (err) {
      console.error('移動エラー:', err);
      alert(err instanceof Error ? err.message : '移動に失敗しました');
    } finally {
      setIsMoving(false);
    }
  }, [material, selectedFolderPath, onMove, onClose, isMoving]);

  // ルート（未分類）を選択
  const selectRoot = useCallback(() => {
    setSelectedFolderPath('');
  }, []);

  if (!isOpen || !material) return null;

  const folderTree = buildFolderTree();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">資料を移動</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{material.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
            disabled={isMoving}
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              移動先を選択
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-96 overflow-y-auto">
              {/* ルート（未分類）オプション */}
              <div
                className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  selectedFolderPath === ''
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
                onClick={selectRoot}
              >
                <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="flex-1">未分類（ルート）</span>
                {selectedFolderPath === '' && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>

              {/* フォルダツリー */}
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  読み込み中...
                </div>
              ) : folderTree.length > 0 ? (
                folderTree.map((node) => renderFolderNode(node))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  フォルダがありません
                </div>
              )}
            </div>
          </div>

          {/* 現在の場所 */}
          {currentFolderPath && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                現在の場所: <span className="font-medium">{currentFolderPath || '未分類'}</span>
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isMoving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={isMoving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMoving ? '移動中...' : '移動'}
          </button>
        </div>
      </div>
    </div>
  );
}

