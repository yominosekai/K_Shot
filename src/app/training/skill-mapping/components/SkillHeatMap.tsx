// スキルマップヒートマップコンポーネント

'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface HeatMapData {
  userId: string;
  category: string;
  maxPhase: number;
  phaseBreakdown: Record<number, number>;
}

interface SkillHeatMapProps {
  users: Array<{ id: string; display_name: string; department?: string }>;
  categories: string[];
  data: HeatMapData[];
  loading?: boolean;
  onRefresh?: () => void;
}

// ライトモード用の色
const getLightColor = (phase: number) => {
  const colors: Record<number, string> = {
    0: '#f3f4f6', // フェーズ0（未設定）
    1: '#f0f0f0', // フェーズ1
    2: '#bfdbfe', // フェーズ2
    3: '#60a5fa', // フェーズ3
    4: '#3b82f6', // フェーズ4
    5: '#1e40af', // フェーズ5
  };
  return colors[phase] || colors[0];
};

// ダークモード用の色
const getDarkColor = (phase: number) => {
  const colors: Record<number, string> = {
    0: '#374151', // フェーズ0（未設定）
    1: '#4b5563', // フェーズ1
    2: '#1e3a8a', // フェーズ2
    3: '#1e40af', // フェーズ3
    4: '#2563eb', // フェーズ4
    5: '#3b82f6', // フェーズ5
  };
  return colors[phase] || colors[0];
};

// 数字の色を決定（背景色に応じて）
const getTextColor = (phase: number, isDark: boolean) => {
  if (isDark) {
    // ダークモードでは、フェーズ1-2は明るい色、それ以上は白
    return phase <= 2 ? '#e5e7eb' : '#ffffff';
  } else {
    // ライトモードでは、フェーズ1-2は暗い色、それ以上は白
    return phase <= 2 ? '#1f2937' : '#ffffff';
  }
};

export default function SkillHeatMap({ users, categories, data, loading, onRefresh }: SkillHeatMapProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getCellStyle = (phase: number) => ({
    backgroundColor: isDark ? getDarkColor(phase) : getLightColor(phase),
    color: getTextColor(phase, isDark),
  });

  // データをマップに変換（高速アクセス用）
  const dataMap = new Map<string, HeatMapData>();
  for (const item of data) {
    const key = `${item.userId}|${item.category}`;
    dataMap.set(key, item);
  }

  // 内訳を取得（最大フェーズまでの各フェーズの完了数）
  const getBreakdown = (breakdown: Record<number, number>): Array<{ phase: number; count: number }> => {
    const result: Array<{ phase: number; count: number }> = [];
    for (let phase = 1; phase <= 5; phase++) {
      const count = breakdown[phase] || 0;
      if (count > 0) {
        result.push({ phase, count });
      }
    }
    return result;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (users.length === 0 || categories.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400">データがありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        ヒートマップ（チーム全体の一覧）
      </h3>

      {/* 切り替えボタン */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBreakdown(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !showBreakdown
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            最大フェーズ表示
          </button>
          <button
            onClick={() => setShowBreakdown(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showBreakdown
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            内訳表示
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {showBreakdown ? '各フェーズの完了数を表示' : '最大フェーズを表示'}
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sticky left-0 z-10">
                名前
              </th>
              <th className="border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                部署
              </th>
              {categories.map(category => (
                <th
                  key={category}
                  className="border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-center text-xs font-semibold text-gray-900 dark:text-gray-100"
                >
                  {category}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="border border-gray-200 dark:border-gray-700 p-2 font-medium text-sm text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                  {user.display_name}
                </td>
                <td className="border border-gray-200 dark:border-gray-700 p-2 text-sm text-gray-700 dark:text-gray-300">
                  {user.department || '-'}
                </td>
                {categories.map(category => {
                  const key = `${user.id}|${category}`;
                  const item = dataMap.get(key);

                  if (!item) {
                    return (
                      <td
                        key={category}
                        className="border border-gray-200 dark:border-gray-700 p-2 text-center"
                      >
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded"
                          style={getCellStyle(0)}
                        >
                          -
                        </span>
                      </td>
                    );
                  }

                  if (showBreakdown) {
                    // 内訳表示モード
                    const breakdown = getBreakdown(item.phaseBreakdown);
                    return (
                      <td
                        key={category}
                        className="border border-gray-200 dark:border-gray-700 p-2 text-center"
                      >
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {breakdown.map(({ phase, count }) => (
                            <span
                              key={phase}
                              className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded text-xs font-bold"
                              style={getCellStyle(phase)}
                            >
                              {count}
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  } else {
                    // 通常モード（最大フェーズ表示）
                    return (
                      <td
                        key={category}
                        className="border border-gray-200 dark:border-gray-700 p-2 text-center font-bold text-sm"
                      >
                        <div className="flex items-center justify-center">
                          <span
                            className="inline-flex items-center justify-center w-8 h-8 rounded"
                            style={getCellStyle(item.maxPhase)}
                          >
                            {item.maxPhase}
                          </span>
                        </div>
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex items-center gap-4 text-sm flex-wrap">
        <span className="text-gray-700 dark:text-gray-300 font-medium">フェーズ:</span>
        {[1, 2, 3, 4, 5].map(phase => (
          <div key={phase} className="flex items-center gap-2">
            <div
              className="w-6 h-6 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center font-bold text-xs"
              style={getCellStyle(phase)}
            >
              {phase}
            </div>
            <span className="text-gray-700 dark:text-gray-300">フェーズ{phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

