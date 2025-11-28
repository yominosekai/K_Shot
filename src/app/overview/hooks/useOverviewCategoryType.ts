// カテゴリ・タイプ別データ取得フック

import { useState, useEffect, useCallback } from 'react';

interface MaterialType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface CategoryData {
  date: string;
  count: number;
}

interface TypeData {
  date: string;
  count: number;
}

export function useOverviewCategoryType(
  period: '7' | '30' | '90' | '365',
  granularity: 'daily' | 'weekly' | 'monthly'
) {
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [typeData, setTypeData] = useState<TypeData[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [typeLoading, setTypeLoading] = useState(false);
  const [categoryName, setCategoryName] = useState<string>('');

  // タイプ一覧を取得
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch('/api/materials/types');
        const data = await response.json();
        if (data.success) {
          setTypes(data.types || []);
        }
      } catch (err) {
        console.error('タイプ取得エラー:', err);
      }
    };
    fetchTypes();
  }, []);

  // カテゴリ別データを取得
  const fetchCategoryData = useCallback(async () => {
    if (!selectedCategory) {
      setCategoryData([]);
      setCategoryName('');
      return;
    }

    setCategoryLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/materials/by-category?category_id=${selectedCategory}&period=${period}&granularity=${granularity}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategoryData(data.data || []);
          setCategoryName(data.category_name || '');
        }
      }
    } catch (err) {
      console.error('カテゴリ別データ取得エラー:', err);
    } finally {
      setCategoryLoading(false);
    }
  }, [selectedCategory, period, granularity]);

  // タイプ別データを取得
  const fetchTypeData = useCallback(async () => {
    if (!selectedType) {
      setTypeData([]);
      return;
    }

    setTypeLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/materials/by-type?type=${encodeURIComponent(selectedType)}&period=${period}&granularity=${granularity}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTypeData(data.data || []);
        }
      }
    } catch (err) {
      console.error('タイプ別データ取得エラー:', err);
    } finally {
      setTypeLoading(false);
    }
  }, [selectedType, period, granularity]);

  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  useEffect(() => {
    fetchTypeData();
  }, [fetchTypeData]);

  return {
    types,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    categoryData,
    typeData,
    categoryLoading,
    typeLoading,
    categoryName,
  };
}



