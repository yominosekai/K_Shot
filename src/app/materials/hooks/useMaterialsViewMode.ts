// 資料ページのビューモード管理フック

import { useState, useEffect } from 'react';

export function useMaterialsViewMode() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mounted, setMounted] = useState(false);

  // ローカルストレージから表示スタイルを読み込む
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('materials_viewMode') as 'grid' | 'list' | null;
      if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  // 表示スタイルをローカルストレージに保存
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('materials_viewMode', viewMode);
    }
  }, [viewMode, mounted]);

  return {
    viewMode,
    setViewMode,
    mounted,
  };
}

