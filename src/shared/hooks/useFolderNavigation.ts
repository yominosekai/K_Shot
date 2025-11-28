// フォルダ階層管理のカスタムフック

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFolders } from '@/contexts/FoldersContext';
import type { MaterialNormalized, FolderEntry, FolderNormalized } from '@/features/materials/types';

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface UseFolderNavigationProps {
  refreshTrigger?: number;
  onPathChange?: (path: string) => void;
  fetchCreators?: (materials: MaterialNormalized[]) => Promise<void>;
}

export function useFolderNavigation({
  refreshTrigger = 0,
  onPathChange,
  fetchCreators,
}: UseFolderNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { folders, fetchFolders } = useFolders(); // Contextから取得
  const refreshTriggerRef = useRef(refreshTrigger);
  
  // refreshTriggerの変更を追跡
  useEffect(() => {
    refreshTriggerRef.current = refreshTrigger;
  }, [refreshTrigger]);
  
  // URLパラメータから初期パスを読み込む
  const initialPath = searchParams.get('path') || '';
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [entries, setEntries] = useState<FolderEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialNormalized[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // URLパラメータの変更を監視（ブラウザの戻るボタン対応）
  useEffect(() => {
    const pathFromUrl = searchParams.get('path') || '';
    if (pathFromUrl !== currentPath) {
      setCurrentPath(pathFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 階層を読み込む
  const loadPath = useCallback(
    async (path: string) => {
      try {
        setLoading(true);

        // 資料を取得（フォルダパスでフィルター）
        const params = new URLSearchParams();
        if (path) {
          params.append('folder_path', path);
        } else {
          // ルートの場合は、folder_pathが空の資料のみ表示
          params.append('folder_path', '');
        }
        params.append('sort_by', 'updated_date');
        params.append('sort_order', 'desc');
        
        // お気に入り数を一括取得
        params.append('include_bookmark_counts', 'true');

        const materialsResponse = await fetch(`/api/materials?${params.toString()}`);
        if (materialsResponse.ok) {
          const materialsData = await materialsResponse.json();
          if (materialsData.success) {
            // フォルダパスが完全に一致する資料のみ表示（子フォルダの資料は除外）
            const filteredMaterials = (materialsData.materials || []).filter(
              (material: MaterialNormalized) => {
                if (!path) {
                  // ルートの場合、folder_pathが空の資料のみ
                  return !material.folder_path || material.folder_path === '';
                } else {
                  // 指定パスと完全に一致する資料のみ（子パスは除外）
                  return material.folder_path === path;
                }
              }
            );
            setMaterials(filteredMaterials);

            // 作成者情報を一括取得
            if (fetchCreators) {
              await fetchCreators(filteredMaterials);
            }
          }
        }

        // フォルダ一覧を取得（Contextから、必要に応じて再取得）
        const allFolders = await fetchFolders(refreshTriggerRef.current > 0); // リフレッシュ時は強制取得

        // 現在のパスの直下のフォルダを取得
        let currentFolders: any[] = [];
        if (!path) {
          // ルートの場合、親IDが空のフォルダ
          currentFolders = allFolders.filter((folder: any) => !folder.parent_id || folder.parent_id === '');
        } else {
          // 指定パスに一致するフォルダを探す
          const currentFolder = allFolders.find((folder: any) => folder.path === path);
          if (currentFolder) {
            // そのフォルダの子フォルダ（parent_idが一致）を取得
            currentFolders = allFolders.filter((folder: any) => folder.parent_id === currentFolder.id);
          }
        }

        // エントリを作成
        const folderEntries: FolderEntry[] = currentFolders.map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          type: 'folder' as const,
          path: folder.path,
        }));

        setEntries(folderEntries);

        // パンくずを構築
        const breadcrumbItems: BreadcrumbItem[] = [{ name: 'ホーム', path: '' }];
        if (path) {
          const pathParts = path.split('/').filter(Boolean);
          let currentBreadcrumbPath = '';
          pathParts.forEach((part) => {
            currentBreadcrumbPath += (currentBreadcrumbPath ? '/' : '') + part;
            breadcrumbItems.push({
              name: part,
              path: currentBreadcrumbPath,
            });
          });
        }
        setBreadcrumb(breadcrumbItems);
      } catch (err) {
        console.error('階層読み込みエラー:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchCreators, fetchFolders]
  );

  // 前回のパスを追跡して、変更時のみ実行
  const prevPathRef = useRef<string | null>(null);
  const prevRefreshTriggerRef = useRef<number>(refreshTrigger);
  
  useEffect(() => {
    // refreshTriggerが変更された場合、またはパスが変更された場合のみ実行
    if (prevPathRef.current !== currentPath || prevRefreshTriggerRef.current !== refreshTrigger) {
      prevPathRef.current = currentPath;
      prevRefreshTriggerRef.current = refreshTrigger;
      loadPath(currentPath);
      if (onPathChange) {
        onPathChange(currentPath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, refreshTrigger]); // loadPathとonPathChangeは依存配列から除外

  const handleFolderClick = useCallback((folderPath: string) => {
    setCurrentPath(folderPath);
    // URLを更新（履歴に追加）
    const newUrl = folderPath
      ? `/materials?path=${encodeURIComponent(folderPath)}`
      : '/materials';
    router.push(newUrl, { scroll: false });
  }, [router]);

  const handleBreadcrumbClick = useCallback((path: string) => {
    setCurrentPath(path);
    // URLを更新（履歴に追加）
    const newUrl = path
      ? `/materials?path=${encodeURIComponent(path)}`
      : '/materials';
    router.push(newUrl, { scroll: false });
  }, [router]);

  // 該当する資料のコメント数だけを更新
  const updateMaterialCommentCount = useCallback(async (materialId: string) => {
    try {
      console.log('[useFolderNavigation] updateMaterialCommentCount開始:', materialId);
      const response = await fetch(`/api/materials/${materialId}/comments-count`);
      if (response.ok) {
        const data = await response.json();
        console.log('[useFolderNavigation] コメント数取得結果:', data);
        if (data.success) {
          setMaterials((prevMaterials) => {
            const updated = prevMaterials.map((material) =>
              material.id === materialId
                ? { ...material, comment_count: data.count }
                : material
            );
            console.log('[useFolderNavigation] materials更新:', {
              materialId,
              oldCount: prevMaterials.find(m => m.id === materialId)?.comment_count,
              newCount: data.count,
              updatedCount: updated.find(m => m.id === materialId)?.comment_count,
            });
            return updated;
          });
        }
      } else {
        console.error('[useFolderNavigation] コメント数取得失敗:', response.status);
      }
    } catch (err) {
      console.error('[useFolderNavigation] コメント数更新エラー:', err);
    }
  }, []);

  // 該当する資料のお気に入り数だけを更新
  const updateMaterialBookmarkCount = useCallback(async (materialId: string, bookmarkCount: number) => {
    setMaterials((prevMaterials) => {
      return prevMaterials.map((material) =>
        material.id === materialId
          ? { ...material, bookmark_count: bookmarkCount }
          : material
      );
    });
  }, []);

  return {
    currentPath,
    entries,
    materials,
    breadcrumb,
    loading,
    folders,
    handleFolderClick,
    handleBreadcrumbClick,
    updateMaterialCommentCount,
    updateMaterialBookmarkCount,
  };
}

