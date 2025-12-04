// ランキングセクションコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, Eye, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useUsers } from '@/contexts/UsersContext';

interface RankingItem {
  materialId: string;
  title: string;
  count: number;
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
}

interface OverviewRankingsSectionProps {
  rankingType: 'likes' | 'views';
  onRankingTypeChange: (type: 'likes' | 'views') => void;
  rankings: RankingItem[];
  loading: boolean;
  cached?: boolean;
  onRefresh?: () => void;
}

export default function OverviewRankingsSection({
  rankingType,
  onRankingTypeChange,
  rankings,
  loading,
  cached = false,
  onRefresh,
}: OverviewRankingsSectionProps) {
  const { getAvatarUrl, getUsers: getUsersFromContext } = useUsers();
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleRankings = isExpanded ? rankings : rankings.slice(0, 3);
  const hasMore = rankings.length > 3;

  // ランキングデータが取得されたら、作成者情報を一括取得
  useEffect(() => {
    if (rankings.length === 0 || loading) {
      return;
    }

    // 作成者のユーザーIDを収集
    const uniqueCreatorIds = new Set<string>();
    rankings.forEach((item) => {
      if (item.createdBy) {
        uniqueCreatorIds.add(item.createdBy);
      }
    });

    // ユーザー情報を一括取得（UsersContextのキャッシュを使用）
    if (uniqueCreatorIds.size > 0) {
      getUsersFromContext(Array.from(uniqueCreatorIds)).catch((err) => {
        console.error('[OverviewRankingsSection] 作成者情報一括取得エラー:', err);
      });
    }
  }, [rankings, loading, getUsersFromContext]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          資料ランキング
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={cached ? 'キャッシュを無効化して最新データを取得' : '最新データを取得'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{cached ? '更新' : '再取得'}</span>
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex space-x-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onRankingTypeChange('likes')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            rankingType === 'likes'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ThumbsUp className="w-4 h-4" />
            <span>いいね</span>
          </div>
        </button>
        <button
          onClick={() => onRankingTypeChange('views')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            rankingType === 'views'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>閲覧数</span>
          </div>
        </button>
      </div>

      {/* ランキングリスト */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
        </div>
      ) : rankings.length > 0 ? (
        <div className="space-y-2">
          {visibleRankings.map((item, index) => (
            <div
              key={item.materialId}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {index < 3 ? (
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-md shadow-yellow-500/50' // 金メダル
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-300 to-gray-500 shadow-md shadow-gray-400/50' // 銀メダル
                      : 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-md shadow-orange-500/50' // 銅メダル
                  }`}>
                    {index + 1}
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-semibold border border-gray-300 dark:border-gray-600">
                    {index + 1}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.title}
                  </p>
                  {item.createdByName && (
                    <div className="flex items-center space-x-2 mt-1">
                      {/* アバター */}
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0">
                        {(() => {
                          if (!item.createdBy) {
                            return (
                              <span>
                                {item.createdByName?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            );
                          }
                          const avatarUrl = getAvatarUrl(item.createdBy);
                          return avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={item.createdByName || 'Avatar'}
                              width={20}
                              height={20}
                              className="w-full h-full object-cover"
                              unoptimized={false}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>
                              {item.createdByName?.charAt(0).toUpperCase() || item.createdBy?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          );
                        })()}
                      </div>
                      {/* ユーザー名 */}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.createdByName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.count}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  {rankingType === 'likes' ? 'いいね' : '閲覧'}
                </span>
              </div>
            </div>
          ))}
          {hasMore && (
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
                  <span>もっと見る ({rankings.length - 3}件)</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">データがありません</p>
        </div>
      )}
    </div>
  );
}

