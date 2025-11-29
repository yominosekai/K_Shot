'use client';

import { useEffect, useState, useMemo, FormEvent, useCallback } from 'react';
import { Heart, Grid, List, RefreshCw, Search, Trash2, Download, Info, Bell, FileEdit, Copy } from 'lucide-react';
import MaterialCard from '@/components/MaterialCard';
import MaterialListItem from '@/components/MaterialListItem';
import MaterialModal from '@/components/MaterialModal';
import CommentModal from '@/components/CommentModal';
import Toast from '@/components/Toast';
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu';
import MaterialCreationModal from '@/components/MaterialCreationModal';
import NotificationSendModal from '@/components/NotificationSendModal';
import MaterialInfoModal from '@/components/MaterialInfoModal';
import type { MaterialNormalized } from '@/features/materials/types';
import { useMaterialsPage } from '@/shared/hooks/useMaterialsPage';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { downloadMaterialAsZip } from '@/shared/lib/utils/material-download';
import { useCategories } from '@/contexts/CategoriesContext';

export default function FavoritesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mounted, setMounted] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [commentMaterial, setCommentMaterial] = useState<MaterialNormalized | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [editMaterial, setEditMaterial] = useState<MaterialNormalized | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notificationMaterial, setNotificationMaterial] = useState<MaterialNormalized | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [infoMaterial, setInfoMaterial] = useState<MaterialNormalized | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const { user } = useAuth();
  const confirmDialog = useConfirmDialog();
  const { categories } = useCategories();

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
  }, []);

  const {
    materials,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedFilter,
    setSelectedFilter,
    bookmarkedIds,
    creatorCache,
    setCreatorCache,
    handleBookmark,
    fetchMaterials,
    refreshMaterials,
    updateMaterialCommentCount,
    bookmarks,
  } = useMaterialsPage();

  // 初回にお気に入りフィルターを適用
  useEffect(() => {
    setSelectedFilter('starred');
  }, [setSelectedFilter]);

  // フィルター適用後に資料を取得
  useEffect(() => {
    if (selectedFilter === 'starred') {
      fetchMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]); // fetchMaterialsは依存配列から除外（再作成されるたびに再実行されるのを防ぐ）

  // お気に入りIDが取得された後に、お気に入りフィルターが適用されている場合は再取得
  useEffect(() => {
    if (selectedFilter === 'starred' && bookmarkedIds.size > 0) {
      // お気に入りIDが取得された後に再取得（フィルタリングが正しく動作するように）
      fetchMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkedIds.size, selectedFilter]); // bookmarkedIds.sizeを依存配列に追加

  // 検索語をローカル状態に同期
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // 表示モードの初期化
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('favorites_viewMode') as 'grid' | 'list' | null;
      if (savedViewMode === 'grid' || savedViewMode === 'list') {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  // 表示モードを保存
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('favorites_viewMode', viewMode);
    }
  }, [viewMode, mounted]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(localSearch.trim());
  };

  const handleRefresh = useCallback(async () => {
    try {
      await refreshMaterials();
      showToast('情報を更新しました');
    } catch (err) {
      console.error('更新エラー:', err);
      showToast('更新に失敗しました');
    }
  }, [refreshMaterials, showToast]);

  const handleCleanup = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsCleaningUp(true);
    try {
      // まず削除対象をチェック（check_only=true）
      const checkResponse = await fetch(`/api/users/${encodeURIComponent(user.id)}/bookmarks/cleanup?check_only=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!checkResponse.ok) {
        showToast('お気に入りのチェックに失敗しました');
        return;
      }

      const checkData = await checkResponse.json();
      
      if (!checkData.success) {
        showToast(checkData.error || 'お気に入りのチェックに失敗しました');
        return;
      }

      // 削除対象がない場合
      if (checkData.removedCount === 0) {
        showToast('削除するお気に入りがありません');
        return;
      }

      // 削除対象がある場合、確認モーダルを表示
      const removedMaterials = checkData.removedMaterials || [];
      const removedList = removedMaterials
        .map((m: { id: string; title?: string }) => `・${m.title || m.id}`)
        .join('\n');

      const confirmed = await confirmDialog({
        title: '存在しない資料を削除',
        message: (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              以下の{removedMaterials.length}件の存在しない資料をお気に入りから削除しますか？
            </p>
            <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                {removedList}
              </pre>
            </div>
          </div>
        ),
        confirmText: '削除する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });

      if (!confirmed) {
        return;
      }

      // 削除を実行（check_onlyなし）
      const deleteResponse = await fetch(`/api/users/${encodeURIComponent(user.id)}/bookmarks/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        if (deleteData.success) {
          // お気に入り一覧を再取得
          if (bookmarks?.fetchBookmarks) {
            await bookmarks.fetchBookmarks();
          }
          // 資料一覧を再取得
          await refreshMaterials();
          
          // 成功メッセージを表示
          showToast(`${removedMaterials.length}件の存在しない資料をお気に入りから削除しました`);
        } else {
          showToast(deleteData.error || 'お気に入りの削除に失敗しました');
        }
      } else {
        showToast('お気に入りの削除に失敗しました');
      }
    } catch (err) {
      console.error('お気に入りクリーンアップエラー:', err);
      showToast('お気に入りのクリーンアップに失敗しました');
    } finally {
      setIsCleaningUp(false);
    }
  }, [user?.id, confirmDialog, bookmarks, refreshMaterials, showToast]);

  // 資料アイテムの右クリックメニューの処理
  const handleMaterialContextMenu = useCallback((e: React.MouseEvent, material: MaterialNormalized) => {
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
                setEditMaterial(data.material);
                setIsEditModalOpen(true);
                return;
              }
            }
            // 詳細取得に失敗した場合は基本情報のみで編集
            setEditMaterial(material);
            setIsEditModalOpen(true);
          } catch (err) {
            console.error('資料詳細取得エラー:', err);
            // エラーが発生した場合は基本情報のみで編集
            setEditMaterial(material);
            setIsEditModalOpen(true);
          }
        },
      },
      {
        label: 'リンクをコピー',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => {
          const url = `${window.location.origin}/materials?material=${encodeURIComponent(material.id)}`;
          navigator.clipboard.writeText(url).then(() => {
            showToast('リンクをコピーしました');
          }).catch(() => {
            // フォールバック
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('リンクをコピーしました');
          });
        },
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
                // 既存のmaterialオブジェクトの統計情報（bookmark_count, views, likes）を保持
                setInfoMaterial({
                  ...data.material,
                  bookmark_count: material.bookmark_count ?? data.material.bookmark_count ?? 0,
                  views: material.views ?? data.material.views ?? 0,
                  likes: material.likes ?? data.material.likes ?? 0,
                });
                setIsInfoModalOpen(true);
                return;
              }
            }
            // 詳細取得に失敗した場合は基本情報のみで表示
            setInfoMaterial(material);
            setIsInfoModalOpen(true);
          } catch (err) {
            console.error('資料詳細取得エラー:', err);
            // エラーが発生した場合は基本情報のみで表示
            setInfoMaterial(material);
            setIsInfoModalOpen(true);
          }
        },
      },
      {
        label: '通知',
        icon: <Bell className="w-4 h-4" />,
        onClick: () => {
          setNotificationMaterial(material);
          setIsNotificationModalOpen(true);
        },
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
  }, [showToast]);

  // 背景の右クリックメニューの処理
  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
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
        onClick: handleRefresh,
      },
      {
        label: '存在しない資料をチェック',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: handleCleanup,
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
  }, [handleRefresh, handleCleanup]);

  const handleOpenMaterial = (material: MaterialNormalized) => {
    setSelectedMaterial(material);
    setIsMaterialModalOpen(true);
  };

  const favoriteCount = useMemo(() => materials.length, [materials]);

  return (
    <div className="flex-1 overflow-auto p-6" onContextMenu={handleBackgroundContextMenu}>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              お気に入り
              {favoriteCount > 0 && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({favoriteCount}件)
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              お気に入り登録した資料を一覧で確認できます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="カード表示"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="リスト表示"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="タイトル・キーワードで検索"
                className="flex-1 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
          </form>
        </section>

        {/* コンテンツエリア */}
        <div className="min-h-[calc(100vh-300px)]" onContextMenu={handleBackgroundContextMenu}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          )}

          {!loading && materials.length === 0 && (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
              <Heart className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                お気に入りはまだありません
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                共有資料ページで気になる資料をお気に入りに追加すると、ここに表示されます。
              </p>
            </div>
          )}

          {!loading && materials.length > 0 && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-3'
              }
            >
            {materials.map((material) =>
              viewMode === 'grid' ? (
                <div
                  key={material.id}
                  data-material-item
                  onContextMenu={(e) => handleMaterialContextMenu(e, material)}
                >
                  <MaterialCard
                    material={material}
                    onClick={() => handleOpenMaterial(material)}
                    onBookmark={handleBookmark}
                    isBookmarked={bookmarkedIds.has(material.id)}
                    onCommentClick={(materialId) => {
                      setCommentMaterial(material);
                      setIsCommentModalOpen(true);
                    }}
                  />
                </div>
              ) : (
                <div
                  key={material.id}
                  data-material-item
                  onContextMenu={(e) => handleMaterialContextMenu(e, material)}
                >
                  <MaterialListItem
                    material={material}
                    onClick={() => handleOpenMaterial(material)}
                    onBookmark={handleBookmark}
                    isBookmarked={bookmarkedIds.has(material.id)}
                    creatorCache={creatorCache}
                    onCommentClick={(materialId) => {
                      setCommentMaterial(material);
                      setIsCommentModalOpen(true);
                    }}
                  />
                </div>
              )
            )}
            </div>
          )}
        </div>
      </div>

      <MaterialModal
        material={selectedMaterial}
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setSelectedMaterial(null);
        }}
        onBookmark={handleBookmark}
        isBookmarked={selectedMaterial ? bookmarkedIds.has(selectedMaterial.id) : false}
        onCommentClick={
          selectedMaterial
            ? () => {
                setCommentMaterial(selectedMaterial);
                setIsCommentModalOpen(true);
              }
            : undefined
        }
        creatorCache={creatorCache}
        onCreatorCacheUpdate={setCreatorCache}
      />

      <CommentModal
        material={commentMaterial}
        isOpen={isCommentModalOpen}
        onClose={() => {
          setIsCommentModalOpen(false);
          setCommentMaterial(null);
        }}
        onCommentAdded={(materialId) => {
          updateMaterialCommentCount(materialId);
        }}
      />

      {/* 資料編集モーダル */}
      <MaterialCreationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditMaterial(null);
        }}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setEditMaterial(null);
          refreshMaterials();
        }}
        categories={categories as any}
        editMaterial={editMaterial}
        initialFolderPath={editMaterial?.folder_path || undefined}
      />

      {/* 通知送信モーダル */}
      <NotificationSendModal
        isOpen={isNotificationModalOpen}
        onClose={() => {
          setIsNotificationModalOpen(false);
          setNotificationMaterial(null);
        }}
        material={notificationMaterial}
        onSuccess={() => {
          showToast('通知を送信しました');
        }}
      />

      {/* ファイル情報モーダル */}
      <MaterialInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setInfoMaterial(null);
        }}
        material={infoMaterial}
      />

      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />

      {/* コンテキストメニュー */}
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

