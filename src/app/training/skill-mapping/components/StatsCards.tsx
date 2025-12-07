// 統計カードコンポーネント

'use client';

import { Users, TrendingUp, Award, Target } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    averagePhase: number;
    phase4Plus: number;
    department: string;
    phaseDistribution: Record<number, number>;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">総ユーザー数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.totalUsers}名
            </p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">平均フェーズ</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.averagePhase.toFixed(1)}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">フェーズ4以上</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.phase4Plus}名
            </p>
          </div>
          <Award className="w-8 h-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">部署</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stats.department === 'all' ? 'すべて' : stats.department}
            </p>
          </div>
          <Target className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    </div>
  );
}

