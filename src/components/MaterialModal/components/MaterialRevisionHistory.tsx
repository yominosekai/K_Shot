// 資料更新履歴コンポーネント

'use client';

import Image from 'next/image';
import type { MaterialRevision } from '@/features/materials/types';
import type { MaterialNormalized } from '@/features/materials/types';
import { useUsers } from '@/contexts/UsersContext';

interface MaterialRevisionHistoryProps {
  revisionHistory: MaterialRevision[];
  material: MaterialNormalized;
  isHistoryLoading: boolean;
  historyError: string | null;
}

export default function MaterialRevisionHistory({
  revisionHistory,
  material,
  isHistoryLoading,
  historyError,
}: MaterialRevisionHistoryProps) {
  const { users: userCache, getAvatarUrl } = useUsers();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">更新履歴</h3>
        {isHistoryLoading && (
          <span className="text-xs text-gray-400">読み込み中...</span>
        )}
      </div>
      {historyError && (
        <p className="text-sm text-red-500">{historyError}</p>
      )}
      {!historyError && revisionHistory.length === 0 && !isHistoryLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          まだ履歴がありません。
        </p>
      )}
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
        {revisionHistory.map((revision) => {
          // updated_byがnullの場合、material.created_byを使う
          const effectiveSid = revision.updated_by || material.created_by;
          const revisionUser = effectiveSid ? userCache.get(effectiveSid) : null;
          
          return (
            <div
              key={revision.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 items-center text-sm"
            >
              <p className="text-gray-900 dark:text-gray-100 truncate">
                {revision.comment?.trim() || '更新理由の記載なし'}
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatDateTime(revision.updated_date)}
              </span>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0">
                  {(() => {
                    if (!effectiveSid) {
                      return (
                        <span>
                          {revision.updated_by_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      );
                    }
                    const avatarUrl = getAvatarUrl(effectiveSid);
                    // タイムスタンプを含めたkeyを使用して、アバター更新時に強制的に再レンダリング
                    const avatarKey = avatarUrl ? `${effectiveSid}-${avatarUrl.split('v=')[1] || Date.now()}` : `${effectiveSid}-no-avatar`;
                    return avatarUrl ? (
                      <Image
                        key={avatarKey}
                        src={avatarUrl}
                        alt={revisionUser?.display_name || revision.updated_by_name || 'Avatar'}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized={false}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>
                        {revisionUser?.display_name?.charAt(0).toUpperCase() ||
                          revision.updated_by_name?.charAt(0).toUpperCase() ||
                          effectiveSid?.charAt(0).toUpperCase() ||
                          'U'}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {revisionUser?.display_name ||
                    revision.updated_by_name ||
                    effectiveSid}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

