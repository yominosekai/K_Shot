// 資料メタデータ管理フック（タイプ、難易度、カテゴリ）

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCategories } from '@/contexts/CategoriesContext';

interface MaterialType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface DifficultyLevel {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

export function useMaterialMetadata(isOpen: boolean) {
  const { categories, fetchCategories } = useCategories();
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingDifficulties, setLoadingDifficulties] = useState(false);
  
  // 新規追加フォームの状態
  const [showTypeAddForm, setShowTypeAddForm] = useState(false);
  const [showCategoryAddForm, setShowCategoryAddForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  
  // 入力欄への参照
  const newTypeNameInputRef = useRef<HTMLInputElement>(null);
  const newCategoryNameInputRef = useRef<HTMLInputElement>(null);

  const fetchTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const response = await fetch('/api/materials/types');
      const data = await response.json();
      if (data.success) {
        setTypes(data.types || []);
      }
    } catch (err) {
      console.error('タイプ取得エラー:', err);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories(true);
      fetchTypes();

      setLoadingDifficulties(true);
      fetch('/api/materials/difficulties')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDifficulties(data.difficulties || []);
          }
        })
        .catch((err) => {
          console.error('難易度取得エラー:', err);
        })
        .finally(() => {
          setLoadingDifficulties(false);
        });
    }
  }, [isOpen, fetchTypes, fetchCategories]);

  // タイプを追加
  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      alert('名前を入力してください');
      return null;
    }

    setAddingType(true);
    try {
      const response = await fetch('/api/materials/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTypeName.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTypes((prev) => [...prev, data.type]);
        setNewTypeName('');
        setShowTypeAddForm(false);
        return data;
      } else {
        alert(data.error || 'タイプの追加に失敗しました');
        return null;
      }
    } catch (err) {
      console.error('タイプ追加エラー:', err);
      alert('タイプの追加に失敗しました');
      return null;
    } finally {
      setAddingType(false);
    }
  };

  // カテゴリを追加
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('カテゴリ名を入力してください');
      return null;
    }

    setAddingCategory(true);
    try {
      const response = await fetch('/api/materials/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parent_id: '', // ルートカテゴリとして追加
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchCategories(true);
        setNewCategoryName('');
        setShowCategoryAddForm(false);
        return data;
      } else {
        await fetchCategories(true);
        alert(data.error || 'カテゴリの追加に失敗しました');
        return null;
      }
    } catch (err) {
      console.error('カテゴリ追加エラー:', err);
      await fetchCategories(true);
      alert('カテゴリの追加に失敗しました');
      return null;
    } finally {
      setAddingCategory(false);
    }
  };

  // タイプ追加フォームが表示されたときにフォーカス
  useEffect(() => {
    if (showTypeAddForm && newTypeNameInputRef.current) {
      newTypeNameInputRef.current.focus();
    }
  }, [showTypeAddForm]);

  // カテゴリ追加フォームが表示されたときにフォーカス
  useEffect(() => {
    if (showCategoryAddForm && newCategoryNameInputRef.current) {
      newCategoryNameInputRef.current.focus();
    }
  }, [showCategoryAddForm]);

  return {
    types,
    difficulties,
    categories,
    loadingTypes,
    loadingDifficulties,
    showTypeAddForm,
    setShowTypeAddForm,
    showCategoryAddForm,
    setShowCategoryAddForm,
    newTypeName,
    setNewTypeName,
    newCategoryName,
    setNewCategoryName,
    addingType,
    addingCategory,
    newTypeNameInputRef,
    newCategoryNameInputRef,
    handleAddType,
    handleAddCategory,
  };
}

