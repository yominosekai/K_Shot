// スキル項目の関連資料表示モーダルコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { X, FileText, ChevronRight, Highlighter } from 'lucide-react';
import type { MaterialNormalized } from '@/features/materials/types';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface SkillRelatedMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillPhaseItemId: number;
  skillPhaseItemName: string;
  onMaterialClick: (material: MaterialNormalized) => void;
  readOnly?: boolean; // 読み取り専用モード（進捗編集の制御）
  allowUnlink?: boolean; // 関連付け解除を許可するか（プロフィールページではfalse、管理ページではtrue）
  onHighlightSkills?: (materialTitle: string) => void; // 関連スキルにハイライトを付けるコールバック
  onUnlink?: (skillPhaseItemId: number) => void; // 関連付け解除時に親コンポーネントに通知するコールバック
}

interface RelatedMaterial {
  id: string;
  title: string;
  description: string;
  type: string;
  category_name: string;
  folder_path: string;
  breadcrumbs: string[];
  displayOrder: number | null;
}

export default function SkillRelatedMaterialsModal({
  isOpen,
  onClose,
  skillPhaseItemId,
  skillPhaseItemName,
  onMaterialClick,
  readOnly = false,
  allowUnlink = true, // デフォルトは許可（管理ページ用）
  onHighlightSkills,
  onUnlink,
}: SkillRelatedMaterialsModalProps) {
  const [materials, setMaterials] = useState<RelatedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const confirmDialog = useConfirmDialog();

  // 関連資料を取得
  useEffect(() => {
    if (!isOpen) return;

    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/skill-mapping/items/${skillPhaseItemId}/materials`);
        if (!response.ok) {
          throw new Error('関連資料の取得に失敗しました');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || '関連資料の取得に失敗しました');
        }

        setMaterials(data.materials || []);
      } catch (err) {
        console.error('関連資料取得エラー:', err);
        setError(err instanceof Error ? err.message : '関連資料の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [isOpen, skillPhaseItemId]);

  // 関連付けを解除
  const handleUnlink = async (materialId: string) => {
    const confirmed = await confirmDialog({
      title: '関連付けの解除',
      message: 'この資料との関連付けを解除しますか？',
      confirmText: '解除',
      cancelText: 'キャンセル',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/skill-mapping/items/${skillPhaseItemId}/materials/${materialId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '関連付けの解除に失敗しました');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '関連付けの解除に失敗しました');
      }

      // ローカル状態から削除
      setMaterials((prev) => {
        const updated = prev.filter((m) => m.id !== materialId);
        // すべての関連付けが解除された場合、親コンポーネントに通知してモーダルを閉じる
        if (updated.length === 0) {
          if (onUnlink) {
            onUnlink(skillPhaseItemId);
          }
          // モーダルを自動的に閉じる
          setTimeout(() => {
            onClose();
          }, 100);
        }
        return updated;
      });
    } catch (err) {
      console.error('関連付け解除エラー:', err);
      alert(err instanceof Error ? err.message : '関連付けの解除に失敗しました');
    }
  };

  // 資料をクリック
  const handleMaterialClick = async (material: RelatedMaterial) => {
    try {
      const response = await fetch(`/api/materials/${material.id}`);
      if (!response.ok) {
        throw new Error('資料の取得に失敗しました');
      }

      const data = await response.json();
      if (!data.success || !data.material) {
        throw new Error('資料の取得に失敗しました');
      }

      onMaterialClick(data.material);
    } catch (err) {
      console.error('資料取得エラー:', err);
      alert(err instanceof Error ? err.message : '資料の取得に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">関連資料</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{skillPhaseItemName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">関連資料がありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onContextMenu={(e) => {
                    if (!onHighlightSkills) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const items: ContextMenuItem[] = [
                      {
                        label: '関連スキルにハイライト',
                        icon: <Highlighter className="w-4 h-4" />,
                        onClick: () => {
                          onHighlightSkills(material.title);
                        },
                      },
                    ];
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items,
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleMaterialClick(material)}
                    >
                      {/* パンくず */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
                        {material.breadcrumbs.map((crumb, index) => (
                          <span key={index} className="flex items-center gap-1">
                            <span>{crumb}</span>
                            {index < material.breadcrumbs.length - 1 && (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </span>
                        ))}
                      </div>

                      {/* タイトル */}
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {material.title}
                        </h3>
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {material.type}
                        </span>
                      </div>

                      {/* 説明 */}
                      {material.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {material.description}
                        </p>
                      )}
                    </div>

                    {/* 解除ボタン（allowUnlinkがtrueの場合のみ表示） */}
                    {allowUnlink && (
                      <button
                        onClick={() => handleUnlink(material.id)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        aria-label="関連付けを解除"
                        title="関連付けを解除"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* 右クリックメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

