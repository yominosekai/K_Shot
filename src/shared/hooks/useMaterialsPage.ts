// 資料ページの状態管理カスタムフック

import { useState, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';
import { useCategories } from '@/contexts/CategoriesContext';
import { useMaterialsCache } from './useMaterialsCache';
import { useMaterialsFilter } from './useMaterialsFilter';
import { useMaterialsFetch } from './useMaterialsFetch';
import { useMaterialsBookmarks } from './useMaterialsBookmarks';
import { useMaterialDetail } from './useMaterialDetail';
import { useCreatorCache } from './useCreatorCache';

export function useMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { categories } = useCategories(); // Contextから取得
  const { creatorCache, setCreatorCache } = useCreatorCache();
  
  // 各機能を分離したフック
  const cache = useMaterialsCache();
  const bookmarks = useMaterialsBookmarks();
  const fetch = useMaterialsFetch();
  const detail = useMaterialDetail();
  
  // フィルタリング（bookmarkedIdsが必要なため、fetchの後に定義）
  const filter = useMaterialsFilter(fetch.materials, bookmarks.bookmarkedIds);

  // fetchMaterialsのラッパー（検索語を含めた完全なキーを生成）
  const fetchMaterials = useCallback(
    async (forceFullRefresh: boolean = false) => {
      const cacheKey = `${searchTerm || ''}_${filter.selectedCategory || ''}_${filter.selectedType || ''}_${filter.selectedCreator || ''}`;
      await fetch.fetchMaterials(
        searchTerm,
        filter.selectedCategory,
        filter.selectedType,
        filter.selectedCreator,
        forceFullRefresh,
        cache.getFromCache,
        cache.setToCache
      );
    },
    [searchTerm, filter.selectedCategory, filter.selectedType, filter.selectedCreator, fetch.fetchMaterials, cache.getFromCache, cache.setToCache]
  );

  // お気に入り切り替えのラッパー（キャッシュをクリア）
  const handleBookmark = useCallback(
    async (materialId: string) => {
      // お気に入りを切り替え
      await bookmarks.handleBookmark(materialId);
      
      // お気に入りフィルターが適用されている場合、キャッシュをクリアして再取得
      if (filter.selectedFilter === 'starred') {
        // 現在のフィルター条件のキャッシュキーを生成
        const cacheKey = `${searchTerm || ''}_${filter.selectedCategory || ''}_${filter.selectedType || ''}_${filter.selectedCreator || ''}`;
        // キャッシュをクリア
        cache.deleteFromCache(cacheKey);
        // 資料を再取得（強制リフレッシュ）
        await fetchMaterials(true);
      } else {
        // お気に入りフィルターが適用されていない場合でも、
        // お気に入りフィルター用のキャッシュをクリアしておく
        // （お気に入りページに移動した時に最新のデータが表示されるように）
        const starredCacheKey = `${searchTerm || ''}_${filter.selectedCategory || ''}_${filter.selectedType || ''}_${filter.selectedCreator || ''}`;
        cache.deleteFromCache(starredCacheKey);
      }
    },
    [bookmarks.handleBookmark, filter.selectedFilter, filter.selectedCategory, filter.selectedType, filter.selectedCreator, searchTerm, cache.deleteFromCache, fetchMaterials]
  );

  // refreshMaterialsのラッパー
  const refreshMaterials = useCallback(async () => {
    await fetch.refreshMaterials(
      searchTerm,
      filter.selectedCategory,
      filter.selectedType,
      filter.selectedCreator,
      fetch.fetchMaterials,
      cache.getFromCache,
      cache.setToCache,
      cache.deleteFromCache
    );
  }, [searchTerm, filter.selectedCategory, filter.selectedType, filter.selectedCreator, fetch, cache]);

  return {
    materials: filter.filteredMaterials,
    categories,
    loading: fetch.loading,
    error: fetch.error,
    searchTerm,
    setSearchTerm,
    selectedCategory: filter.selectedCategory,
    setSelectedCategory: filter.setSelectedCategory,
    selectedType: filter.selectedType,
    setSelectedType: filter.setSelectedType,
    selectedCreator: filter.selectedCreator,
    setSelectedCreator: filter.setSelectedCreator,
    selectedFilter: filter.selectedFilter,
    setSelectedFilter: filter.setSelectedFilter,
    bookmarkedIds: bookmarks.bookmarkedIds,
    creatorCache,
    setCreatorCache,
    fetchMaterialDetail: detail.fetchMaterialDetail,
    handleBookmark,
    refreshMaterials,
    fetchMaterials,
    updateMaterialCommentCount: fetch.updateMaterialCommentCount,
    updateMaterialBookmarkCount: fetch.updateMaterialBookmarkCount,
  };
}

