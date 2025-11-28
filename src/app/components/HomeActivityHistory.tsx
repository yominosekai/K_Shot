// ホームページの閲覧履歴セクション

import { useState } from 'react';
import { Clock, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActivityHistoryItem } from '@/shared/lib/utils/activity-history';

interface HomeActivityHistoryProps {
  activities: ActivityHistoryItem[];
  onMaterialClick: (materialId: string, materialTitle?: string) => void;
  onRemoveActivity: (materialId: string, viewedAt: string, e: React.MouseEvent) => void;
}

// 相対時間を計算
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeActivityHistory({
  activities,
  onMaterialClick,
  onRemoveActivity,
}: HomeActivityHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-blue-500" />
        閲覧履歴
      </h2>
      {activities.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          まだ閲覧した資料がありません
        </p>
      ) : (
        <div className="space-y-3">
          {(isExpanded ? activities : activities.slice(0, 4)).map((activity) => (
            <div
              key={`${activity.materialId}-${activity.viewedAt}`}
              className="group relative w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <button
                onClick={() => onMaterialClick(activity.materialId, activity.materialTitle)}
                className="w-full text-left flex items-start space-x-3"
              >
                <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {activity.materialTitle}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatRelativeTime(activity.viewedAt)}に閲覧
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => onRemoveActivity(activity.materialId, activity.viewedAt, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                aria-label="削除"
                title="削除"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          ))}
          {activities.length > 4 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>折りたたむ</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>もっと見る ({activities.length - 4}件)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

