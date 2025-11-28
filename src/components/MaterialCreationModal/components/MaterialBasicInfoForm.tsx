// 基本情報フォームコンポーネント

'use client';

import { useRef, useEffect } from 'react';
import type { CategoryNormalized } from '@/features/materials/types';

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

interface MaterialBasicInfoFormProps {
  formData: {
    title: string;
    type: string;
    category_id: string;
    difficulty: string;
    estimated_hours: number;
    tags: string;
    description: string;
  };
  onFormDataChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFormDataUpdate: (field: string, value: any) => void;
  types: MaterialType[];
  difficulties: DifficultyLevel[];
  categories: CategoryNormalized[];
  loadingTypes: boolean;
  loadingDifficulties: boolean;
  isUploading: boolean;
  showTypeAddForm: boolean;
  setShowTypeAddForm: (show: boolean) => void;
  showCategoryAddForm: boolean;
  setShowCategoryAddForm: (show: boolean) => void;
  newTypeName: string;
  setNewTypeName: (name: string) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  addingType: boolean;
  addingCategory: boolean;
  newTypeNameInputRef: React.RefObject<HTMLInputElement | null>;
  newCategoryNameInputRef: React.RefObject<HTMLInputElement | null>;
  onAddType: () => void;
  onAddCategory: () => void;
  isOpen?: boolean;
  isEditMode?: boolean;
}

export default function MaterialBasicInfoForm({
  formData,
  onFormDataChange,
  onFormDataUpdate,
  types,
  difficulties,
  categories,
  loadingTypes,
  loadingDifficulties,
  isUploading,
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
  onAddType,
  onAddCategory,
  isOpen = false,
  isEditMode = false,
}: MaterialBasicInfoFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開かれたとき（新規作成時のみ）にタイトル入力欄に自動フォーカス
  useEffect(() => {
    if (isOpen && !isEditMode && !isUploading) {
      // 少し遅延を入れて確実にフォーカス
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isEditMode, isUploading]);

  // オートコンプリートで値が変更されたときにも状態を更新
  const handleTitleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const syntheticEvent = {
      ...e,
      target: {
        ...e.currentTarget,
        name: 'title',
        value: e.currentTarget.value,
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onFormDataChange(syntheticEvent);
  };

  // タグ入力欄のオートコンプリート対応
  const handleTagsInput = (e: React.FormEvent<HTMLInputElement>) => {
    const syntheticEvent = {
      ...e,
      target: {
        ...e.currentTarget,
        name: 'tags',
        value: e.currentTarget.value,
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onFormDataChange(syntheticEvent);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">基本情報</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            ref={titleInputRef}
            type="text"
            name="title"
            value={formData.title}
            onChange={onFormDataChange}
            onInput={handleTitleInput}
            autoComplete="off"
            required
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* タイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            タイプ <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setShowTypeAddForm(true);
                onFormDataUpdate('type', '');
              } else {
                setShowTypeAddForm(false);
                onFormDataChange(e);
              }
            }}
            required
            disabled={isUploading || loadingTypes}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {types.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
            <option value="__new__">＋ 新規追加</option>
          </select>
          {showTypeAddForm && (
            <div className="mt-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    名前
                  </label>
                  <input
                    ref={newTypeNameInputRef}
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="例: ワークシート"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onAddType}
                    disabled={addingType || !newTypeName.trim()}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingType ? '追加中...' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTypeAddForm(false);
                      setNewTypeName('');
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            カテゴリ <span className="text-red-500">*</span>
          </label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setShowCategoryAddForm(true);
                onFormDataUpdate('category_id', '');
              } else {
                setShowCategoryAddForm(false);
                onFormDataChange(e);
              }
            }}
            required
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="__new__">＋ 新規追加</option>
          </select>
          {showCategoryAddForm && (
            <div className="mt-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    名前
                  </label>
                  <input
                    ref={newCategoryNameInputRef}
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="例: プログラミング基礎"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onAddCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingCategory ? '追加中...' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryAddForm(false);
                      setNewCategoryName('');
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 難易度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            難易度 <span className="text-red-500">*</span>
          </label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={onFormDataChange}
            required
            disabled={isUploading || loadingDifficulties}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {difficulties.map((difficulty) => (
              <option key={difficulty.id} value={difficulty.name}>
                {difficulty.name}
              </option>
            ))}
          </select>
        </div>

        {/* 推定学習時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            推定学習時間（時間）
          </label>
          <input
            type="number"
            name="estimated_hours"
            value={formData.estimated_hours}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              onFormDataUpdate('estimated_hours', value);
            }}
            min="0"
            step="0.5"
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* タグ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            タグ（カンマ区切り）
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={onFormDataChange}
            onInput={handleTagsInput}
            autoComplete="off"
            placeholder="例: HTML, CSS, 基礎"
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* 概要（全幅） */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          概要 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onFormDataChange}
          required
          rows={3}
          disabled={isUploading}
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}



