// フォルダ移動モーダルコンポーネント

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Folder, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useFolders } from '@/contexts/FoldersContext';
import type { FolderNormalized } from '@/features/materials/types';

interface FolderMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderNormalized | null;
  onMove: (folderId: string, targetParentId: string) => Promise<void>;
  currentParentId?: string;
}

interface FolderTreeNode {
  folder: FolderNormalized;
  children: FolderTreeNode[];
  isExpanded: boolean;
}

export default function FolderMoveModal({
  isOpen,
  onClose,
  folder,
  onMove,
  currentParentId = '',
}: FolderMoveModalProps) {
  const { folders: allFolders, fetchFolders } = useFolders(); // Contextから取得
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // フォルダ一覧を取得（Contextから、必要に応じて再取得）
  useEffect(() => {
    if (isOpen) {
      fetchFolders(); // Contextから取得（キャッシュがあれば使用）
      
      // 現在の親フォルダIDを設定
      if (currentParentId) {
        setSelectedParentId(currentParentId);
      } else {
        setSelectedParentId('');
      }
    }
  }, [isOpen, currentParentId, fetchFolders]);

  // 自分自身と自分の子孫フォルダを除外したフォルダ一覧
  const folders = allFolders.filter((f: FolderNormalized) => {
    if (!folder) return true;
    // 自分自身を除外
    if (f.id === folder.id) return false;
    // 自分の子孫を除外（再帰的にチェック）
    const isDescendant = (checkFolder: FolderNormalized): boolean => {
      if (checkFolder.parent_id === folder.id) return true;
      const parent = allFolders.find((p: FolderNormalized) => p.id === checkFolder.parent_id);
      if (!parent) return false;
      return isDescendant(parent);
    };
    return !isDescendant(f);
  });

  // フォルダツリーを構築
  const buildFolderTree = useCallback((): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // すべてのフォルダをノードに変換
    folders.forEach((f) => {
      folderMap.set(f.path || f.name, {
        folder: f,
        children: [],
        isExpanded: expandedPaths.has(f.path || f.name),
      });
    });

    // 親子関係を構築
    folders.forEach((f) => {
      const node = folderMap.get(f.path || f.name);
      if (!node) return;

      if (!f.parent_id || f.parent_id === '') {
        // ルートフォルダ
        rootFolders.push(node);
      } else {
        // 親フォルダを探す
        const parent = folders.find((p) => p.id === f.parent_id);
        if (parent) {
          const parentNode = folderMap.get(parent.path || parent.name);
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
      const folderId = node.folder.id;
      const path = node.folder.path || node.folder.name;
      const isSelected = selectedParentId === folderId;
      const hasChildren = node.children.length > 0;

      return (
        <div key={folderId}>
          <div
            className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
            style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
            onClick={() => setSelectedParentId(folderId)}
          >
            {/* 展開/折りたたみアイコン */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(path);
                }}
                className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                type="button"
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
    [selectedParentId, toggleExpand]
  );

  // 移動実行
  const handleMove = useCallback(async () => {
    if (!folder || isMoving) return;

    setIsMoving(true);
    try {
      await onMove(folder.id, selectedParentId);
      onClose();
    } catch (err) {
      console.error('移動エラー:', err);
      alert(err instanceof Error ? err.message : '移動に失敗しました');
    } finally {
      setIsMoving(false);
    }
  }, [folder, selectedParentId, onMove, onClose, isMoving]);

  // ルートを選択
  const selectRoot = useCallback(() => {
    setSelectedParentId('');
  }, []);

  if (!isOpen || !folder) return null;

  const folderTree = buildFolderTree();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">フォルダを移動</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{folder.name}</p>
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
              {/* ルートオプション */}
              <div
                className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  selectedParentId === ''
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
                onClick={selectRoot}
              >
                <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="flex-1">ルート（最上位）</span>
                {selectedParentId === '' && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>

              {/* フォルダツリー */}
              {false ? (
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

