'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useKnowledgeManagementTab } from './hooks/useKnowledgeManagementTab';
import { useActivityTabs } from './hooks/useActivityTabs';
import OverviewTabs from './components/OverviewTabs';
import KnowledgeManagementView from './components/KnowledgeManagementView';
import ActivityOverallView from './components/ActivityOverallView';
import ActivityIndividualView from './components/ActivityIndividualView';
import type { OverviewTabType } from './types';

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // タブ管理
  const [activeTab, setActiveTab] = useState<OverviewTabType>('overall');

  // タブ別の状態管理
  const knowledgeTab = useKnowledgeManagementTab();
  const activityTabs = useActivityTabs({
    activeTab,
    onTabChange: (tab) => setActiveTab(tab),
  });

  // 管理者権限チェック
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                利用状況
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                システム全体の統計とアクティビティ推移
              </p>
            </div>
          </div>
        </div>

        {/* タブ */}
        <OverviewTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedUserName={activityTabs.selectedUser?.displayName}
        />

        {/* タブコンテンツ */}
        {activeTab === 'knowledge' && (
          <KnowledgeManagementView
            stats={knowledgeTab.stats}
            period={knowledgeTab.period}
            granularity={knowledgeTab.granularity}
            userActivityData={knowledgeTab.userActivityData}
            materialActivityData={knowledgeTab.materialActivityData}
            activityLoading={knowledgeTab.activityLoading}
            types={knowledgeTab.types}
            selectedCategory={knowledgeTab.selectedCategory}
            setSelectedCategory={knowledgeTab.setSelectedCategory}
            selectedType={knowledgeTab.selectedType}
            setSelectedType={knowledgeTab.setSelectedType}
            categoryData={knowledgeTab.categoryData}
            typeData={knowledgeTab.typeData}
            categoryLoading={knowledgeTab.categoryLoading}
            typeLoading={knowledgeTab.typeLoading}
            categoryName={knowledgeTab.categoryName}
            onPeriodChange={knowledgeTab.setPeriod}
            onGranularityChange={knowledgeTab.setGranularity}
            onRefresh={knowledgeTab.onRefresh}
          />
        )}

        {activeTab === 'overall' && (
          <div>
            {activityTabs.activityDataError && (
              <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{activityTabs.activityDataError}</p>
              </div>
            )}
            {activityTabs.activityDataLoading && !activityTabs.overallData ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
              </div>
            ) : activityTabs.overallData ? (
              <ActivityOverallView data={activityTabs.overallData} onUserSelect={activityTabs.onUserSelect} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">データがありません</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'individual' && (
          <div>
            {activityTabs.activityDataError && (
              <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{activityTabs.activityDataError}</p>
              </div>
            )}
            {!activityTabs.selectedUser ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">ユーザーを選択してください</p>
                <button
                  onClick={() => setActiveTab('overall')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  全体ビューに戻る
                </button>
              </div>
            ) : activityTabs.activityDataLoading && !activityTabs.individualData ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">データを読み込み中...</p>
              </div>
            ) : activityTabs.individualData && activityTabs.individualData.user ? (
              <ActivityIndividualView
                user={activityTabs.individualData.user}
                period={activityTabs.activityPeriod}
                customRange={activityTabs.customDateRange}
                onBack={activityTabs.onBack}
                onPeriodChange={activityTabs.setActivityPeriod}
                onCustomRangeChange={activityTabs.setCustomDateRange}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">データがありません</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
