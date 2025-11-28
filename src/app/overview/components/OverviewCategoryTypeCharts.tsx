// カテゴリ・タイプ別グラフコンポーネント

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../utils/dateUtils';
import { useCategories } from '@/contexts/CategoriesContext';

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

interface OverviewCategoryTypeChartsProps {
  types: MaterialType[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  categoryData: CategoryData[];
  typeData: TypeData[];
  categoryLoading: boolean;
  typeLoading: boolean;
  categoryName: string;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export default function OverviewCategoryTypeCharts({
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
  granularity,
}: OverviewCategoryTypeChartsProps) {
  const { categories } = useCategories();

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        カテゴリ・タイプ別資料数
      </h3>

      {/* 選択UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            カテゴリを選択
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">選択してください</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            タイプを選択
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">選択してください</option>
            {types.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* グラフ表示エリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* カテゴリ別グラフ */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            {categoryName ? `${categoryName}の資料数推移` : 'カテゴリを選択してください'}
          </h4>
          {!selectedCategory ? (
            <div className="h-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">カテゴリを選択するとグラフが表示されます</p>
            </div>
          ) : categoryLoading ? (
            <div className="h-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(label) => formatDate(label, granularity)}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(label, granularity)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="資料数"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">データがありません</p>
            </div>
          )}
        </div>

        {/* タイプ別グラフ */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            {selectedType ? `${selectedType}の資料数推移` : 'タイプを選択してください'}
          </h4>
          {!selectedType ? (
            <div className="h-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">タイプを選択するとグラフが表示されます</p>
            </div>
          ) : typeLoading ? (
            <div className="h-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(label) => formatDate(label, granularity)}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(label, granularity)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="資料数"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">データがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



