// 全体ビューコンポーネント（ナレッジDB活用分析の全体タブ）

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import { Calendar, TrendingUp, BookOpen, Users, ArrowRight } from 'lucide-react';
import type { ActivityStatsResponse, UserActivityStats } from '@/app/overview/types';

interface ActivityOverallViewProps {
  data: ActivityStatsResponse;
  onUserSelect: (user: UserActivityStats) => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function ActivityOverallView({ data, onUserSelect }: ActivityOverallViewProps) {
  const { overallStats, userRankings, userDistribution } = data;

  // 分布データの色分け
  const distributionData = userDistribution.map(user => ({
    ...user,
    color: user.activityLevel === 'high' ? '#10b981' : user.activityLevel === 'medium' ? '#f59e0b' : '#ef4444',
  }));

  // カスタムTooltip（ユーザー名を表示）
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{data.displayName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">閲覧数:</span> {data.viewCount}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">ユニーク資料数:</span> {data.uniqueMaterials}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 全体サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総閲覧数</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{overallStats.totalViews}</p>
            </div>
            <BookOpen className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">平均閲覧数</p>
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{overallStats.avgViews}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-pink-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">活発ユーザー</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{overallStats.activeUsers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">5日以上活動</p>
            </div>
            <Calendar className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* 追加統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総資料数</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{overallStats.totalMaterials}</p>
            </div>
            <BookOpen className="w-12 h-12 text-indigo-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総ユーザー数</p>
              <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{overallStats.totalUsers}</p>
            </div>
            <Users className="w-12 h-12 text-teal-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* ユーザー別活動一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">ユーザー別活動一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">順位</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">ユーザー名</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">閲覧数</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">閲覧資料数</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">アップロード数</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">活動日数</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">詳細</th>
              </tr>
            </thead>
            <tbody>
              {userRankings.map((user, index) => (
                <tr key={user.userSid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-gray-100">{index + 1}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{user.displayName}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100 font-medium">{user.viewCount}回</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">{user.uniqueMaterials}件</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">{user.uploadedMaterials}件</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{user.activeDays}日</span>
                      <div className="flex gap-0.5">
                        {Array.from({length: 5}).map((_, i) => (
                          <div key={i} className={`w-2 h-4 rounded-sm ${i < Math.ceil(user.activeDays / 6) ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onUserSelect(user)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-1 mx-auto"
                    >
                      詳細 <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ユーザー分布グラフ */}
      {userDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">ユーザー分布（閲覧数 × 資料の多様性）</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>見方：</strong>横軸（X軸）は閲覧数、縦軸（Y軸）はユニーク資料数（閲覧した資料の種類数）を表します。
            右上に近いほど（閲覧数が多く、かつ多様な資料を閲覧）高活用、左下に近いほど低活用と判断できます。
            同じ資料を何度も閲覧するユーザーは横に伸び、様々な資料を閲覧するユーザーは縦に伸びます。
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="viewCount" name="閲覧数" stroke="#6b7280" />
              <YAxis dataKey="uniqueMaterials" name="ユニーク資料数" stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="ユーザー" data={distributionData}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">高活用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">中活用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">低活用</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

