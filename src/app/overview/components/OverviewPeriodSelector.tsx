// 期間・粒度選択コンポーネント

import { getAvailableGranularities } from '../utils/dateUtils';

interface OverviewPeriodSelectorProps {
  period: '7' | '30' | '90' | '365';
  granularity: 'daily' | 'weekly' | 'monthly';
  onPeriodChange: (period: '7' | '30' | '90' | '365') => void;
  onGranularityChange: (granularity: 'daily' | 'weekly' | 'monthly') => void;
}

export default function OverviewPeriodSelector({
  period,
  granularity,
  onPeriodChange,
  onGranularityChange,
}: OverviewPeriodSelectorProps) {
  const availableGranularities = getAvailableGranularities(period);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center space-x-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            期間:
          </label>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as '7' | '30' | '90' | '365')}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="7">直近7日</option>
            <option value="30">直近30日</option>
            <option value="90">直近90日</option>
            <option value="365">直近1年</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            粒度:
          </label>
          <select
            value={granularity}
            onChange={(e) => onGranularityChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            disabled={availableGranularities.length === 1}
          >
            {availableGranularities.includes('daily') && (
              <option value="daily">日次</option>
            )}
            {availableGranularities.includes('weekly') && (
              <option value="weekly">週次</option>
            )}
            {availableGranularities.includes('monthly') && (
              <option value="monthly">月次</option>
            )}
          </select>
        </div>
      </div>
    </div>
  );
}



