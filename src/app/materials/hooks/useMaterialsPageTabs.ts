// 資料ページのタブ管理フック

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearch } from '@/contexts/SearchContext';

export function useMaterialsPageTabs(
  mounted: boolean,
  fetchMaterials: () => Promise<void>,
  fetchMaterialDetail: (materialId: string) => Promise<any>,
  setSearchTerm: (term: string) => void,
  searchTerm: string,
  selectedCategory: string,
  selectedType: string,
  selectedCreator: string
) {
  const searchParams = useSearchParams();
  const { setSearchValueAndFocus } = useSearch();
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');
  const prevActiveTabRef = useRef<'browse' | 'search' | null>(null);
  const prevFilterRef = useRef<string>('');

  // 検索タブがアクティブな時のみ資料を取得
  useEffect(() => {
    if (mounted && activeTab === 'search' && prevActiveTabRef.current !== 'search') {
      prevActiveTabRef.current = 'search';
      const currentFilter = `${searchTerm || ''}_${selectedCategory || ''}_${selectedType || ''}`;
      prevFilterRef.current = currentFilter;
      fetchMaterials();
    } else if (activeTab === 'browse') {
      prevActiveTabRef.current = 'browse';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, activeTab]);

  // 検索タブでフィルター（検索語、カテゴリ、タイプ、作成者）が変更されたときに資料を再取得
  useEffect(() => {
    if (mounted && activeTab === 'search') {
      const currentFilter = `${searchTerm || ''}_${selectedCategory || ''}_${selectedType || ''}_${selectedCreator || ''}`;
      // フィルター条件が変更された場合のみ再取得（初回実行時は前のuseEffectで実行済み）
      if (prevFilterRef.current !== currentFilter) {
        prevFilterRef.current = currentFilter;
        fetchMaterials();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, activeTab, searchTerm, selectedCategory, selectedType, selectedCreator]);

  // URLパラメータの処理（path、material、search、tab）
  useEffect(() => {
    if (!mounted) return;

    const pathParam = searchParams.get('path');
    const materialParam = searchParams.get('material');
    const searchParam = searchParams.get('search');
    const tabParam = searchParams.get('tab');

    // pathパラメータがある場合：ブラウザタブに切り替え
    if (pathParam) {
      setActiveTab('browse');
    }

    // searchパラメータがある場合：検索タブに切り替え
    if (searchParam) {
      setActiveTab('search');
      setSearchTerm(searchParam);
      // ヘッダーの検索欄にも値を設定
      if (setSearchValueAndFocus) {
        setSearchValueAndFocus(searchParam);
      }
    }

    // tabパラメータがある場合：指定されたタブに切り替え
    if (tabParam === 'search') {
      setActiveTab('search');
    } else if (tabParam === 'browse') {
      setActiveTab('browse');
    }

    // materialパラメータがある場合：モーダルを開く（この処理は親コンポーネントで行う）
    // ここではmaterialParamを返すだけ
  }, [mounted, searchParams, setSearchTerm, setSearchValueAndFocus]);

  return {
    activeTab,
    setActiveTab,
  };
}

