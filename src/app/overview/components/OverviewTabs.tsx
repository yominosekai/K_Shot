// 全体状況ページのタブコンポーネント

'use client';

type TabType = 'knowledge' | 'overall' | 'individual';

interface OverviewTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedUserName?: string;
}

export default function OverviewTabs({
  activeTab,
  onTabChange,
  selectedUserName,
}: OverviewTabsProps) {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => onTabChange('overall')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'overall'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          全体
        </button>
        <button
          onClick={() => onTabChange('individual')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'individual'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          個別 {selectedUserName && `(${selectedUserName})`}
        </button>
        <button
          onClick={() => onTabChange('knowledge')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'knowledge'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          ナレッジ運用
        </button>
      </div>
    </div>
  );
}

