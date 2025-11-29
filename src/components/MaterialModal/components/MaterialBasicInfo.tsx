// 資料基本情報コンポーネント

'use client';

import type { MaterialNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';

interface MaterialBasicInfoProps {
  material: MaterialNormalized;
  creator: User | null;
}

export default function MaterialBasicInfo({ material, creator }: MaterialBasicInfoProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDifficultyName = (difficulty?: string) => {
    if (!difficulty) return '-';
    // 難易度はDBから取得するため、そのまま表示（既に日本語）
    return difficulty;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        基本情報
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {/* 左列 */}
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              ID:
            </span>
            <span className="text-gray-900 dark:text-gray-100">{material.id}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              タイプ:
            </span>
            <span className="text-gray-900 dark:text-gray-100">{material.type}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              カテゴリ:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {material.category_name || '-'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              難易度:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {getDifficultyName(material.difficulty)}
            </span>
          </div>
        </div>

        {/* 右列 */}
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              時間:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {material.estimated_hours ? `${material.estimated_hours}時間` : '-'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              作成者:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {creator ? creator.display_name : material.created_by_name || material.created_by || '-'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
              更新日:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatDate(material.updated_date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

