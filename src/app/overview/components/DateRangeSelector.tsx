// 日付範囲選択コンポーネント（Kibana風）

'use client';

import { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { getJSTDateString } from '@/shared/lib/utils/timezone';
import type { Period, CustomDateRange } from '@/app/overview/types';

interface DateRangeSelectorProps {
  period: Period;
  customRange?: CustomDateRange;
  onPeriodChange: (period: Period) => void;
  onCustomRangeChange?: (range: CustomDateRange) => void;
}

const periodOptions: Array<{ value: Exclude<Period, 'custom'>; label: string; days: number }> = [
  { value: '1month', label: '1ヶ月', days: 30 },
  { value: '3months', label: '3ヶ月', days: 90 },
  { value: '6months', label: '半年', days: 180 },
  { value: '1year', label: '1年', days: 365 },
];

export default function DateRangeSelector({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  // 今日の日付を取得（YYYY-MM-DD形式）
  const getTodayString = () => {
    return getJSTDateString(0);
  };

  // 期間に応じて開始日を計算
  const calculateStartDate = (selectedPeriod: Period): string => {
    if (selectedPeriod === 'custom' && customRange) {
      return customRange.startDate;
    }
    const option = periodOptions.find(opt => opt.value === selectedPeriod);
    if (option) {
      return getJSTDateString(option.days);
    }
    return getJSTDateString(30); // デフォルトは1ヶ月
  };

  // 期間に応じて終了日を取得
  const getEndDate = (): string => {
    if (period === 'custom' && customRange) {
      return customRange.endDate;
    }
    return getTodayString();
  };

  // 期間が変更されたときに日付範囲を自動更新
  useEffect(() => {
    if (period !== 'custom' && onCustomRangeChange) {
      const option = periodOptions.find(opt => opt.value === period);
      if (option) {
        onCustomRangeChange({
          startDate: getJSTDateString(option.days),
          endDate: getTodayString(),
        });
      }
    }
  }, [period, onCustomRangeChange]);

  const handlePeriodChange = (newPeriod: Exclude<Period, 'custom'>) => {
    onPeriodChange(newPeriod);
    // 期間に応じて日付範囲を自動設定
    if (onCustomRangeChange) {
      const option = periodOptions.find(opt => opt.value === newPeriod);
      if (option) {
        onCustomRangeChange({
          startDate: getJSTDateString(option.days),
          endDate: getTodayString(),
        });
      }
    }
  };

  const handleStartDateChange = (date: string) => {
    if (onCustomRangeChange) {
      onCustomRangeChange({
        startDate: date,
        endDate: getEndDate(),
      });
      // 日付を手動で変更した場合はカスタムモードに
      onPeriodChange('custom');
    }
  };

  const handleEndDateChange = (date: string) => {
    if (onCustomRangeChange) {
      onCustomRangeChange({
        startDate: calculateStartDate(period),
        endDate: date,
      });
      // 日付を手動で変更した場合はカスタムモードに
      onPeriodChange('custom');
    }
  };

  const currentStartDate = calculateStartDate(period);
  const currentEndDate = getEndDate();

  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap">
        {/* 期間選択ボタン */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">期間:</span>
          <div className="flex gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  period === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 日付範囲選択（常に表示） */}
        <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">開始日:</label>
            <input
              type="date"
              value={customRange?.startDate || currentStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              max={customRange?.endDate || currentEndDate}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <span className="text-gray-500 dark:text-gray-400">〜</span>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">終了日:</label>
            <input
              type="date"
              value={customRange?.endDate || currentEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={customRange?.startDate || currentStartDate}
              max={getTodayString()}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

