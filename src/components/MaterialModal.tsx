// 資料詳細モーダルコンポーネント

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, ThumbsUp, MessageCircle } from 'lucide-react';
import { useMaterialLikes } from '@/shared/hooks/useMaterialLikes';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UsersContext';
import AttachmentTreeView from './AttachmentTreeView';
import MaterialBasicInfo from './MaterialModal/components/MaterialBasicInfo';
import MaterialRevisionHistory from './MaterialModal/components/MaterialRevisionHistory';
import { addMaterialView } from '@/shared/lib/utils/activity-history';
import type { MaterialNormalized, MaterialRevision } from '@/features/materials/types';
import type { User } from '@/features/auth/types';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

interface MaterialModalProps {
  material: MaterialNormalized | null;
  isOpen: boolean;
  onClose: () => void;
  onBookmark?: (materialId: string) => void;
  isBookmarked?: boolean;
  onCommentClick?: (materialId: string) => void;
  creatorCache?: Map<string, User>; // 作成者情報のキャッシュ
  onCreatorCacheUpdate?: (cache: Map<string, User>) => void; // キャッシュ更新コールバック
  onViewsUpdate?: (materialId: string, views: number) => void; // 閲覧数更新コールバック
}

export default function MaterialModal({
  material,
  isOpen,
  onClose,
  onBookmark,
  isBookmarked = false,
  onCommentClick,
  creatorCache,
  onCreatorCacheUpdate,
  onViewsUpdate,
}: MaterialModalProps) {
  const { user } = useAuth();
  const [localCreator, setLocalCreator] = useState<User | null>(null);
  const [localMaterial, setLocalMaterial] = useState<MaterialNormalized | null>(material);
  const [revisionHistory, setRevisionHistory] = useState<MaterialRevision[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { users: userCache, getUsers } = useUsers();
  const onViewsUpdateRef = useRef(onViewsUpdate);
  const viewsUpdateExecutedRef = useRef<string | null>(null);

  // いいね機能
  const { likes, isLiked, isLoading, toggleLike } = useMaterialLikes({
    materialId: material?.id || '',
    initialLikes: material?.likes || 0,
    material: material || {
      id: '',
      uuid: '',
      title: '',
      description: '',
      category_id: '',
      type: '',
      tags: [],
      folder_path: '',
      created_by: '',
      created_date: '',
      updated_date: '',
      is_published: false,
      views: 0,
      likes: 0,
    },
    onLikesUpdate: (newLikes) => {
      if (localMaterial) {
        setLocalMaterial({ ...localMaterial, likes: newLikes });
      }
    },
  });

  // onViewsUpdateの参照を更新
  useEffect(() => {
    onViewsUpdateRef.current = onViewsUpdate;
  }, [onViewsUpdate]);

  // materialが更新されたらlocalMaterialも更新
  useEffect(() => {
    setLocalMaterial(material);
    // materialが変更されたら、閲覧数更新の実行済みフラグをリセット
    viewsUpdateExecutedRef.current = null;
  }, [material]);

  // モーダルが開かれた時に閲覧履歴に記録し、閲覧数を更新
  useEffect(() => {
    if (isOpen && material?.id && user?.id) {
      // 同じ資料IDで既に実行済みの場合はスキップ
      if (viewsUpdateExecutedRef.current === material.id) {
        return;
      }
      
      // 実行済みフラグを設定
      viewsUpdateExecutedRef.current = material.id;
      
      // localStorageに閲覧履歴を記録
      addMaterialView(material.id, material.title);
      
      // APIを呼び出して閲覧数を更新
      const updateViews = async () => {
        try {
          const response = await fetch(`/api/materials/${material.id}?user_id=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.material) {
              const newViews = data.material.views ?? material.views ?? 0;
              // ローカルのmaterialを更新
              setLocalMaterial((prev) => {
                if (prev && prev.id === material.id) {
                  return { ...prev, views: newViews };
                }
                return prev;
              });
              // 親コンポーネントに通知
              onViewsUpdateRef.current?.(material.id, newViews);
            }
          }
        } catch (err) {
          console.error('閲覧数更新エラー:', err);
        }
      };
      
      updateViews();
    }
  }, [isOpen, material?.id, user?.id]);

  // 更新履歴を取得
  useEffect(() => {
    const fetchHistory = async () => {
      if (!material?.id) return;
      try {
        setIsHistoryLoading(true);
        setHistoryError(null);
        const response = await fetch(`/api/materials/${material.id}/history?limit=5`);
        if (!response.ok) {
          throw new Error('履歴取得に失敗しました');
        }
        const data = await response.json();
        if (data.success) {
          setRevisionHistory(data.history || []);
        } else {
          setRevisionHistory([]);
        }
      } catch (err) {
        console.error('資料履歴取得エラー:', err);
        setHistoryError('履歴を取得できませんでした');
      } finally {
        setIsHistoryLoading(false);
      }
    };

    if (isOpen && material?.id) {
      fetchHistory();
    } else {
      setRevisionHistory([]);
      setHistoryError(null);
      setIsHistoryLoading(false);
    }
  }, [isOpen, material?.id]);

  useEffect(() => {
    if (!isOpen || revisionHistory.length === 0 || !material?.created_by) return;
    // updated_byがnullの場合、material.created_byを使う
    const userIds = Array.from(
      new Set(
        revisionHistory
          .map((rev) => rev.updated_by || material.created_by)
          .filter((id): id is string => Boolean(id) && !userCache.has(id))
      )
    );

    if (userIds.length === 0) return;

    getUsers(userIds).catch((err) => {
      console.error('履歴ユーザー一括取得エラー:', err);
    });
  }, [isOpen, revisionHistory, userCache, getUsers, material?.created_by]);

  // モーダルが開かれた時に作成者情報を取得
  useEffect(() => {
    if (isOpen && material?.created_by) {
      // まずキャッシュから取得を試みる
      if (creatorCache?.has(material.created_by)) {
        setLocalCreator(creatorCache.get(material.created_by) || null);
        return;
      }

      // キャッシュにない場合は取得
      const fetchCreator = async () => {
        try {
          const response = await fetch(`/api/users/${material.created_by}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setLocalCreator(data.user);
              // キャッシュを更新
              if (onCreatorCacheUpdate && creatorCache) {
                const newCache = new Map(creatorCache);
                newCache.set(material.created_by, data.user);
                onCreatorCacheUpdate(newCache);
              }
            }
          }
        } catch (err) {
          console.error('作成者情報の取得に失敗:', err);
        }
      };
      fetchCreator();
    } else {
      setLocalCreator(null);
    }
  }, [isOpen, material?.created_by, creatorCache, onCreatorCacheUpdate]);

  if (!isOpen || !material) {
    return null;
  }

  // キャッシュまたはローカルから作成者情報を取得
  const creator = material.created_by && creatorCache
    ? creatorCache.get(material.created_by) || localCreator
    : localCreator;


  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {material.title}
          </h2>
          <div className="flex items-center space-x-2">
            {/* いいねボタン */}
            {material && (
              <button
                onClick={toggleLike}
                disabled={isLoading}
                className="flex items-center space-x-1 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                aria-label={isLiked ? 'いいねを解除' : 'いいねする'}
              >
                <ThumbsUp
                  className={`w-5 h-5 ${
                    isLiked
                      ? 'fill-blue-500 text-blue-500'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {likes}
                </span>
              </button>
            )}
            {onBookmark && (
              <button
                onClick={() => onBookmark(material.id)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label={isBookmarked ? 'お気に入りから削除' : 'お気に入りに追加'}
              >
                <Heart
                  className={`w-6 h-6 ${
                    isBookmarked
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
              </button>
            )}
            {onCommentClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCommentClick(material.id);
                }}
                className="flex items-center space-x-1 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="コメント"
              >
                <MessageCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {material.comment_count ?? 0}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="閉じる"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <MaterialBasicInfo material={material} creator={creator} />
            </div>

            {/* 添付資料 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                📎 添付資料
              </h3>
              <AttachmentTreeView
                attachments={material.attachments || []}
                materialId={material.id}
                rootLabel={`material_${material.id}`}
                onFileOpen={async (attachment) => {
                  try {
                    // relativePathがある場合はそれを使用、なければfilenameを使用
                    const filePath = attachment.relativePath || attachment.filename;
                    const response = await fetch(
                      `/api/materials/${material.id}/open?filename=${encodeURIComponent(filePath)}`
                    );
                    const result = await response.json();
                    if (!result.success) {
                      alert(result.error || 'ファイルを開けませんでした');
                    }
                  } catch (err) {
                    alert('ファイルを開けませんでした');
                    console.error('ファイルを開くエラー:', err);
                  }
                }}
                onFileDownload={(attachment) => {
                  // relativePathがある場合はそれを使用、なければfilenameを使用
                  const filePath = attachment.relativePath || attachment.filename;
                  window.open(
                    `/api/materials/${material.id}/download?filename=${encodeURIComponent(filePath)}`,
                    '_blank'
                  );
                }}
                showActions={true}
              />
            </div>

            {/* 説明 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                説明
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{material.description}</p>
            </div>

            {/* 更新履歴 */}
            <MaterialRevisionHistory
              revisionHistory={revisionHistory}
              material={material}
              isHistoryLoading={isHistoryLoading}
              historyError={historyError}
            />

            {/* コンテンツ本文 */}
            {material.document && material.document.trim() !== '' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  📝 本文
                </h3>
                <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded border min-h-[100px]">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                      {material.document}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

