// ホームページの最近のナレッジセクション

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { FileText, Plus, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import type { RecentMaterialActivity } from '../hooks/useHomePageData';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface HomeRecentMaterialsProps {
  recentMaterials: RecentMaterialActivity[];
  loading: boolean;
  creatorCache: Map<string, UserType>;
  onMaterialClick: (materialId: string, materialTitle?: string) => void;
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

export default function HomeRecentMaterials({
  recentMaterials,
  loading,
  creatorCache,
  onMaterialClick,
}: HomeRecentMaterialsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getAvatarUrl } = useUsers();

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <FileText className="w-5 h-5 mr-2 text-green-500" />
        新規・変更されたナレッジ
      </h2>
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">読み込み中...</p>
      ) : recentMaterials.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          まだナレッジがありません
        </p>
      ) : (
        <div className="space-y-3">
          {(isExpanded ? recentMaterials : recentMaterials.slice(0, 4)).map((activity) => {
            const creator = activity.created_by ? creatorCache.get(activity.created_by) : null;
            
            return (
              <button
                key={`${activity.id}-${activity.updated_date}`}
                onClick={() => onMaterialClick(activity.id, activity.title)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="grid grid-cols-[28px_1fr_250px] gap-3 items-center">
                  {/* 列1: アクションアイコン（固定幅） */}
                  <div className="flex items-center justify-center">
                    {activity.type === 'create' ? (
                      <Plus className="w-5 h-5 text-green-500" />
                    ) : (
                      <Edit className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  
                  {/* 列2: 資料名（可変幅、右端を揃えるためmin-w-0で切り詰め） */}
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                      {activity.title}
                    </span>
                  </div>
                  
                  {/* 列3: 右側の要素群（固定位置、グリッドで各要素の開始位置を固定） */}
                  <div className="grid grid-cols-[32px_auto_120px] gap-3 items-center">
                    {/* アバター（固定幅） */}
                    <div className="flex items-center justify-center">
                      {creator ? (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                          {(() => {
                            const creatorId = creator.id;
                            const avatarUrl = creatorId ? getAvatarUrl(creatorId) : null;
                            return avatarUrl ? (
                              <Image
                                src={avatarUrl}
                                alt={creator.display_name || 'Avatar'}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                                unoptimized={false}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>
                                {creator.display_name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="w-6 h-6" />
                      )}
                    </div>
                    
                    {/* ユーザー名（可変幅） */}
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {creator ? creator.display_name || activity.created_by : activity.created_by_name || activity.created_by}
                      </span>
                    </div>
                    
                    {/* アクション種別と時間（固定幅で開始位置を揃える） */}
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {activity.type === 'create' ? '新規作成' : '更新'} - {formatRelativeTime(activity.updated_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {recentMaterials.length > 4 && (
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
                  <span>もっと見る ({recentMaterials.length - 4}件)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

