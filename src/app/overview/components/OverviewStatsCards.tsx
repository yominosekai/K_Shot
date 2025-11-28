// 主要指標カードコンポーネント

import { Users, FileText, Plus, Edit, TrendingUp } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMaterials: number;
  newMaterialsThisMonth: number;
  updatedMaterialsThisMonth: number;
}

interface OverviewStatsCardsProps {
  stats: Stats;
}

export default function OverviewStatsCards({ stats }: OverviewStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">総ユーザー数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.totalUsers}
            </p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">アクティブユーザー</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.activeUsers}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">直近30日</p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">総資料数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.totalMaterials}
            </p>
          </div>
          <FileText className="w-8 h-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">今月の新規</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.newMaterialsThisMonth}
            </p>
          </div>
          <Plus className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">今月の更新</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.updatedMaterialsThisMonth}
            </p>
          </div>
          <Edit className="w-8 h-8 text-blue-500" />
        </div>
      </div>
    </div>
  );
}



