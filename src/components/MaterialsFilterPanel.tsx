// フィルターパネルコンポーネント

'use client';

import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import type { CategoryNormalized } from '@/features/materials/types';

interface MaterialType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface User {
  sid: string;
  display_name: string;
  username: string;
}

interface MaterialsFilterPanelProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCreator: string;
  onCreatorChange: (creator: string) => void;
  selectedFilter: 'all' | 'starred';
  onFilterChange: (filter: 'all' | 'starred') => void;
  categories: CategoryNormalized[];
}

export default function MaterialsFilterPanel({
  showFilters,
  onToggleFilters,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  selectedCreator,
  onCreatorChange,
  selectedFilter,
  onFilterChange,
  categories,
}: MaterialsFilterPanelProps) {
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [creators, setCreators] = useState<User[]>([]);

  // タイプを取得
  useEffect(() => {
    fetch('/api/materials/types')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTypes(data.types || []);
        }
      })
      .catch((err) => {
        console.error('タイプ取得エラー:', err);
      });
  }, []);

  // 作成者一覧を取得
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // display_nameでソート
          const sortedUsers = (data.users || []).sort((a: User, b: User) => 
            (a.display_name || a.username).localeCompare(b.display_name || b.username, 'ja')
          );
          setCreators(sortedUsers);
        }
      })
      .catch((err) => {
        console.error('作成者取得エラー:', err);
      });
  }, []);

  return (
    <>
      {/* フィルター */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => onFilterChange('all')}
        >
          すべて
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'starred'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => onFilterChange('starred')}
        >
          お気に入り
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
            showFilters
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={onToggleFilters}
        >
          <Filter className="w-4 h-4" />
          <span>フィルター</span>
        </button>
      </div>

      {/* フィルター詳細 */}
      {showFilters && (
        <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                カテゴリ
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="">すべて</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                タイプ
              </label>
              <select
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="">すべて</option>
                {types.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                作成者
              </label>
              <select
                value={selectedCreator}
                onChange={(e) => onCreatorChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="">すべて</option>
                {creators.map((creator) => (
                  <option key={creator.sid} value={creator.sid}>
                    {creator.display_name || creator.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
