// 添付ファイルツリービューコンポーネント（MaterialMoveModalのスタイルを参考）

'use client';

import { useState, useCallback } from 'react';
import { File, Folder, ChevronRight, ChevronDown, Download, ExternalLink, X } from 'lucide-react';
import type { Attachment } from '@/features/materials/types';

interface AttachmentTreeViewProps {
  attachments: Attachment[];
  materialId?: string;
  onFileOpen?: (attachment: Attachment) => void;
  onFileDownload?: (attachment: Attachment) => void;
  onFileDelete?: (filename: string) => void;
  showActions?: boolean;
  rootLabel?: string; // ルートのラベル（例: "material_123" または "添付資料"）
}

interface FileTreeNode {
  name: string;
  path: string;
  isFile: boolean;
  attachment?: Attachment;
  children: FileTreeNode[];
  isExpanded: boolean;
}

export default function AttachmentTreeView({
  attachments,
  materialId,
  onFileOpen,
  onFileDownload,
  onFileDelete,
  showActions = true,
  rootLabel = '添付資料',
}: AttachmentTreeViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // パスからツリー構造を構築
  const buildFileTree = useCallback((): FileTreeNode[] => {
    const root: FileTreeNode = {
      name: rootLabel,
      path: '',
      isFile: false,
      children: [],
      isExpanded: true,
    };

    attachments.forEach((attachment) => {
      // relativePathがある場合はそれを使用、ない場合はルート直下のファイルとして扱う
      if (!attachment.relativePath) {
        // relativePathがない場合：ルート直下のファイルとして追加
        const fileNode: FileTreeNode = {
          name: attachment.original_filename || attachment.filename,
          path: attachment.filename,
          isFile: true,
          attachment,
          children: [],
          isExpanded: false,
        };
        root.children.push(fileNode);
        return;
      }

      // relativePathがある場合：フォルダ構造を構築
      const pathParts = attachment.relativePath.split('/').filter((p) => p.trim() !== '');

      let current = root;
      let currentPath = '';

      pathParts.forEach((part, index) => {
        const isLast = index === pathParts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        // 既存のノードを探す
        // 最後のパート（ファイル）の場合は、ファイルノード（isFile === true）のみを探す
        // そうでない場合（フォルダ）は、フォルダノード（isFile === false）のみを探す
        let node = current.children.find((n) => {
          if (isLast) {
            // ファイルの場合：ファイルノードのみ（isFile === true かつ attachment がある）
            return n.name === part && n.isFile === true && n.attachment !== undefined;
          } else {
            // フォルダの場合：フォルダノードのみ（isFile === false）
            return n.name === part && n.isFile === false;
          }
        });

        if (!node) {
          // 既存のノードが見つからない場合、新しいノードを作成
          // ただし、既に同じ名前のノードが存在する場合は、それを再利用
          const existingNode = current.children.find((n) => n.name === part);
          
          if (existingNode) {
            // 既存のノードが存在する場合
            if (isLast) {
              // ファイルの場合：既存のノードがフォルダの場合は、新しいファイルノードを作成
              if (!existingNode.isFile) {
                // 既存のノードがフォルダの場合は、新しいファイルノードを作成
                node = {
                  name: part,
                  path: currentPath,
                  isFile: true,
                  attachment: attachment,
                  children: [],
                  isExpanded: false,
                };
                current.children.push(node);
              } else {
                // 既存のノードがファイルの場合は、それを更新
                node = existingNode;
                if (!node.attachment) {
                  node.attachment = attachment;
                  if (attachment.original_filename && attachment.original_filename !== part) {
                    node.name = attachment.original_filename;
                  }
                }
              }
            } else {
              // フォルダの場合：既存のノードを再利用
              node = existingNode;
            }
          } else {
            // 既存のノードが存在しない場合、新しいノードを作成
            node = {
              name: part,
              path: currentPath,
              isFile: isLast,
              attachment: isLast ? attachment : undefined,
              children: [],
              isExpanded: expandedPaths.has(currentPath),
            };
            current.children.push(node);
          }
        } else {
          // 既存のノードが見つかった場合
          // ファイルノードの場合は、添付ファイル情報を更新
          if (isLast && !node.attachment) {
            node.attachment = attachment;
            // ファイル名をoriginal_filenameに更新（表示用）
            if (attachment.original_filename && attachment.original_filename !== part) {
              node.name = attachment.original_filename;
            }
          }
        }

        current = node;
      });
    });

    // ソート（フォルダを先に、その後ファイル、それぞれ名前順）
    const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes
        .sort((a, b) => {
          // フォルダとファイルを分離
          if (a.isFile !== b.isFile) {
            return a.isFile ? 1 : -1;
          }
          return a.name.localeCompare(b.name, 'ja');
        })
        .map((node) => ({
          ...node,
          children: sortTree(node.children),
        }));
    };

    return sortTree(root.children);
  }, [attachments, expandedPaths, rootLabel]);

  // ノードの展開/折りたたみ
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

  // ファイルノードをレンダリング
  const renderFileNode = useCallback(
    (node: FileTreeNode, level: number = 0) => {
      const hasChildren = node.children.length > 0;
      const Icon = node.isFile ? File : Folder;

      return (
        <div key={node.path || node.name}>
          <div
            className={`flex items-center py-2 px-3 rounded-lg transition-colors ${
              node.isFile
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-900 dark:text-gray-100'
            }`}
            style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          >
            {/* 展開/折りたたみアイコン */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpand(node.path);
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

            {/* アイコン */}
            <Icon className="w-4 h-4 mr-2 flex-shrink-0" />

            {/* 名前（original_filenameがあればそれを使用） */}
            <span className="flex-1 truncate">
              {node.isFile && node.attachment?.original_filename
                ? node.attachment.original_filename
                : node.name}
            </span>

            {/* ファイルサイズ（ファイルの場合） */}
            {node.isFile && node.attachment?.size && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                {(node.attachment.size / 1024).toFixed(2)} KB
              </span>
            )}

            {/* アクションボタン（ファイルの場合） */}
            {node.isFile && showActions && materialId && node.attachment && (
              <div className="flex items-center gap-1 ml-2">
                {onFileOpen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFileOpen(node.attachment!);
                    }}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="開く"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
                {onFileDownload && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFileDownload(node.attachment!);
                    }}
                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                    title="ダウンロード"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {onFileDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFileDelete(node.attachment!.filename);
                    }}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="削除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 子ノード */}
          {hasChildren && node.isExpanded && (
            <div>{node.children.map((child) => renderFileNode(child, level + 1))}</div>
          )}
        </div>
      );
    },
    [toggleExpand, showActions, materialId, onFileOpen, onFileDownload, onFileDelete]
  );

  const fileTree = buildFileTree();

  if (attachments.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          添付資料はありません
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-96 overflow-y-auto">
      {fileTree.length > 0 ? (
        fileTree.map((node) => renderFileNode(node))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          ファイルがありません
        </div>
      )}
    </div>
  );
}

