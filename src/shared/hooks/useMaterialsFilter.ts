// 資料フィルタリング管理フック

import { useState, useMemo } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';

export function useMaterialsFilter(
  materials: MaterialNormalized[],
  bookmarkedIds: Set<string>
) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'starred'>('all');

  // フィルター条件のキーを生成（キャッシュキーとしても使用）
  const filterKey = useMemo(() => {
    return `${selectedCategory || ''}_${selectedType || ''}_${selectedCreator || ''}`;
  }, [selectedCategory, selectedType, selectedCreator]);

  // フィルター適用後の資料リスト（メモ化して再計算を最適化）
  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      if (selectedFilter === 'starred' && !bookmarkedIds.has(material.id)) {
        return false;
      }
      return true;
    });
  }, [materials, selectedFilter, bookmarkedIds]);

  return {
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    selectedCreator,
    setSelectedCreator,
    selectedFilter,
    setSelectedFilter,
    filterKey,
    filteredMaterials,
  };
}

