// 資料取得管理フック

import { useState, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';
import { useCreatorCache } from './useCreatorCache';

export function useMaterialsFetch() {
  const [materials, setMaterials] = useState<MaterialNormalized[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(() => {
    // localStorageから前回の取得時刻を読み込む
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('materials_last_fetch_time');
      return saved || null;
    }
    return null;
  });
  const [lastFilterKey, setLastFilterKey] = useState<string>(''); // 前回のフィルター条件を記録

  const { fetchCreators } = useCreatorCache();

  // 資料一覧を取得
  const fetchMaterials = useCallback(
    async (
      searchTerm: string,
      selectedCategory: string,
      selectedType: string,
      selectedCreator: string,
      forceFullRefresh: boolean = false,
      getFromCache: (key: string) => MaterialNormalized[] | null,
      setToCache: (key: string, materials: MaterialNormalized[]) => void
    ) => {
      try {
        setLoading(true);
        setError(null);

        // フィルター条件のキーを生成（キャッシュキーとしても使用）
        const currentFilterKey = `${searchTerm || ''}_${selectedCategory || ''}_${selectedType || ''}_${selectedCreator || ''}`;
        
        // キャッシュをチェック（強制リフレッシュの場合はスキップ）
        if (!forceFullRefresh) {
          const cached = getFromCache(currentFilterKey);
          if (cached) {
            setMaterials(cached);
            setLoading(false);
            // 作成者情報を取得（キャッシュには含まれていない可能性があるため）
            await fetchCreators(cached);
            return; // キャッシュから返す
          }
        }

        const params = new URLSearchParams();
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        if (selectedCategory) {
          params.append('category_id', selectedCategory);
        }
        if (selectedType) {
          params.append('type', selectedType);
        }
        if (selectedCreator) {
          params.append('created_by', selectedCreator);
        }
        params.append('sort_by', 'updated_date');
        params.append('sort_order', 'desc');
        
        // お気に入り数を一括取得
        params.append('include_bookmark_counts', 'true');
        
        // 差分更新：前回取得時刻以降の変更のみ取得
        // ただし、フィルター条件が変更された場合、または強制リフレッシュの場合は全件取得
        if (!forceFullRefresh && lastFetchTime && currentFilterKey === lastFilterKey) {
          params.append('since', lastFetchTime);
        }

        const response = await fetch(`/api/materials?${params.toString()}`);
        if (!response.ok) {
          throw new Error('資料の取得に失敗しました');
        }

        const data = await response.json();
        if (data.success) {
          const materialsList = data.materials || [];
          
          // 差分更新の場合：既存の資料とマージ
          // ただし、フィルター条件が変更されていない場合のみマージ
          // フィルター条件が変更された場合は、新しい検索結果で完全に置き換える
          const isFilterChanged = currentFilterKey !== lastFilterKey;
          
          let finalMaterials: MaterialNormalized[] = [];
          
          if (!isFilterChanged && lastFetchTime && materialsList.length > 0) {
            // 差分更新：既存の資料とマージ
            setMaterials((prevMaterials) => {
              if (prevMaterials.length === 0) {
                return materialsList; // 初回取得として扱う
              }
              const materialMap = new Map(prevMaterials.map(m => [m.id, m]));
              // 新しい資料または更新された資料で上書き
              materialsList.forEach((material: MaterialNormalized) => {
                materialMap.set(material.id, material);
              });
              finalMaterials = Array.from(materialMap.values()).sort((a, b) => 
                new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
              );
              return finalMaterials;
            });
          } else {
            // 初回取得または全件取得
            // 既存の資料が空の場合は、差分更新で0件が返っても全件取得する
            if (materialsList.length === 0 && lastFetchTime) {
              // 全件取得を試みる
              const fullParams = new URLSearchParams();
              if (searchTerm) {
                fullParams.append('search', searchTerm);
              }
              if (selectedCategory) {
                fullParams.append('category_id', selectedCategory);
              }
              if (selectedType) {
                fullParams.append('type', selectedType);
              }
              if (selectedCreator) {
                fullParams.append('created_by', selectedCreator);
              }
              fullParams.append('sort_by', 'updated_date');
              fullParams.append('sort_order', 'desc');
              fullParams.append('include_bookmark_counts', 'true');
              // sinceパラメータを付けない（全件取得）
              
              const fullResponse = await fetch(`/api/materials?${fullParams.toString()}`);
              if (fullResponse.ok) {
                const fullData = await fullResponse.json();
                if (fullData.success) {
                  finalMaterials = fullData.materials || [];
                  setMaterials(finalMaterials);
                  // 全件取得したので、lastFetchTimeを更新
                  const newFetchTime = new Date().toISOString();
                  setLastFetchTime(newFetchTime);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('materials_last_fetch_time', newFetchTime);
                  }
                  // キャッシュに保存
                  setToCache(currentFilterKey, finalMaterials);
                  await fetchCreators(finalMaterials);
                  setLoading(false);
                  return;
                }
              }
            }
            
            finalMaterials = materialsList;
            setMaterials(finalMaterials);
          }
          
          // 最終取得時刻を更新（初回取得時、またはデータが取得できた場合のみ）
          const newFetchTime = new Date().toISOString();
          
          if (!lastFetchTime || materialsList.length > 0 || currentFilterKey !== lastFilterKey) {
            // 初回取得時、またはデータが取得できた場合、またはフィルター条件が変更された場合に更新
            setLastFetchTime(newFetchTime);
            setLastFilterKey(currentFilterKey);
            // localStorageにも保存
            if (typeof window !== 'undefined') {
              localStorage.setItem('materials_last_fetch_time', newFetchTime);
              localStorage.setItem('materials_last_filter_key', currentFilterKey);
            }
          }

          // キャッシュに保存（setMaterialsで更新されたデータを使用）
          // finalMaterialsが空の場合は、setMaterialsで更新されたデータを取得
          setMaterials((prevMaterials) => {
            const materialsToCache = finalMaterials.length > 0 ? finalMaterials : prevMaterials;
            setToCache(currentFilterKey, materialsToCache);
            return prevMaterials; // 状態は変更しない（既にsetMaterialsで更新済み）
          });

          // 作成者情報を一括取得
          await fetchCreators(materialsList);
        } else {
          throw new Error(data.error || '資料の取得に失敗しました');
        }
      } catch (err) {
        console.error('資料取得エラー:', err);
        setError(err instanceof Error ? err.message : '資料の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [lastFetchTime, lastFilterKey, fetchCreators]
  );

  // 全件取得でリフレッシュ（差分更新を無視）
  const refreshMaterials = useCallback(
    async (
      searchTerm: string,
      selectedCategory: string,
      selectedType: string,
      selectedCreator: string,
      fetchMaterialsFn: (
        searchTerm: string,
        selectedCategory: string,
        selectedType: string,
        selectedCreator: string,
        forceFullRefresh: boolean,
        getFromCache: (key: string) => MaterialNormalized[] | null,
        setToCache: (key: string, materials: MaterialNormalized[]) => void
      ) => Promise<void>,
      getFromCache: (key: string) => MaterialNormalized[] | null,
      setToCache: (key: string, materials: MaterialNormalized[]) => void,
      deleteFromCache: (key: string) => void
    ) => {
      // lastFetchTimeをリセットして全件取得
      setLastFetchTime(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('materials_last_fetch_time');
        localStorage.removeItem('materials_last_filter_key');
      }
      setLastFilterKey('');
      // キャッシュをクリア（強制リフレッシュ時はキャッシュを無効化）
      const currentFilterKey = `${searchTerm || ''}_${selectedCategory || ''}_${selectedType || ''}_${selectedCreator || ''}`;
      deleteFromCache(currentFilterKey);
      // fetchMaterialsを呼び出して全件取得（forceFullRefresh=true）
      await fetchMaterialsFn(searchTerm, selectedCategory, selectedType, selectedCreator, true, getFromCache, setToCache);
    },
    []
  );

  // 該当する資料のコメント数だけを更新
  const updateMaterialCommentCount = useCallback(async (materialId: string) => {
    try {
      console.log('[useMaterialsFetch] updateMaterialCommentCount開始:', materialId);
      const response = await fetch(`/api/materials/${materialId}/comments-count`);
      if (response.ok) {
        const data = await response.json();
        console.log('[useMaterialsFetch] コメント数取得結果:', data);
        if (data.success) {
          setMaterials((prevMaterials) => {
            const updated = prevMaterials.map((material) =>
              material.id === materialId
                ? { ...material, comment_count: data.count }
                : material
            );
            console.log('[useMaterialsFetch] materials更新:', {
              materialId,
              oldCount: prevMaterials.find(m => m.id === materialId)?.comment_count,
              newCount: data.count,
              updatedCount: updated.find(m => m.id === materialId)?.comment_count,
            });
            return updated;
          });
        }
      } else {
        console.error('[useMaterialsFetch] コメント数取得失敗:', response.status);
      }
    } catch (err) {
      console.error('[useMaterialsFetch] コメント数更新エラー:', err);
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
    materials,
    loading,
    error,
    fetchMaterials,
    refreshMaterials,
    updateMaterialCommentCount,
    updateMaterialBookmarkCount,
  };
}

