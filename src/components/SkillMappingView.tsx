// スキルマップ表示コンポーネント

'use client';

import { useState, useEffect } from 'react';
import type { SkillPhaseItem, ProgressStatus } from '@/shared/lib/data-access/skill-mapping';

interface SkillMappingViewProps {
  userId: string;
  readOnly?: boolean;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export default function SkillMappingView({ userId, readOnly = false, onHasChangesChange }: SkillMappingViewProps) {
  const [items, setItems] = useState<SkillPhaseItem[]>([]);
  const [progress, setProgress] = useState<Map<number, ProgressStatus>>(new Map());
  const [localProgress, setLocalProgress] = useState<Map<number, ProgressStatus>>(new Map()); // ローカルの変更を保持
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // 変更があるかどうか

  // スキルマスタと進捗データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // スキルマスタ取得
        const itemsResponse = await fetch('/api/skill-mapping/items');
        if (!itemsResponse.ok) {
          throw new Error('スキルマスタの取得に失敗しました');
        }
        const itemsData = await itemsResponse.json();
        if (!itemsData.success) {
          throw new Error(itemsData.error || 'スキルマスタの取得に失敗しました');
        }

        // 進捗データ取得
        const progressResponse = await fetch(`/api/skill-mapping/progress?userId=${userId}`);
        if (!progressResponse.ok) {
          throw new Error('進捗データの取得に失敗しました');
        }
        const progressData = await progressResponse.json();
        if (!progressData.success) {
          throw new Error(progressData.error || '進捗データの取得に失敗しました');
        }

        setItems(itemsData.items || []);
        
        // 進捗データをMapに変換
        const progressMap = new Map<number, ProgressStatus>();
        (progressData.progress || []).forEach((p: { skillPhaseItemId: number; status: ProgressStatus }) => {
          progressMap.set(p.skillPhaseItemId, p.status);
        });
        setProgress(progressMap);
        setLocalProgress(new Map(progressMap)); // ローカル状態も初期化
        setHasChanges(false); // 変更フラグをリセット
        onHasChangesChange?.(false); // 親に通知
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  // 進捗状態を循環させる（ローカルのみ更新）
  const cycleProgress = (itemId: number) => {
    if (readOnly || saving) {
      return;
    }

    const currentStatus = localProgress.get(itemId) || 'not_started';
    let nextStatus: ProgressStatus;

    // 履修予定 → 進行中 → 完了 → 履修予定
    switch (currentStatus) {
      case 'not_started':
        nextStatus = 'in_progress';
        break;
      case 'in_progress':
        nextStatus = 'completed';
        break;
      case 'completed':
        nextStatus = 'not_started';
        break;
      default:
        nextStatus = 'not_started';
    }

    // ローカル状態を更新
    setLocalProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(itemId, nextStatus);
      return newMap;
    });
    setHasChanges(true); // 変更フラグを立てる
    onHasChangesChange?.(true); // 親に通知
  };

  // 保存処理
  const handleSave = async () => {
    if (readOnly || saving || !hasChanges) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // 変更された項目のみを取得
      const changes: Array<{ skillPhaseItemId: number; status: ProgressStatus }> = [];
      localProgress.forEach((status, itemId) => {
        const originalStatus = progress.get(itemId) || 'not_started';
        if (status !== originalStatus) {
          changes.push({ skillPhaseItemId: itemId, status });
        }
      });

      if (changes.length === 0) {
        setHasChanges(false);
        return;
      }

      // 各変更をAPIで更新
      for (const change of changes) {
        const response = await fetch('/api/skill-mapping/progress', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(change),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '進捗の更新に失敗しました');
        }
      }

      // サーバー側の状態をローカル状態に反映
      setProgress(new Map(localProgress));
      setHasChanges(false);
      onHasChangesChange?.(false); // 親に通知
    } catch (err) {
      console.error('保存エラー:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 進捗状態に応じたスタイルを取得
  const getStatusStyle = (status: ProgressStatus | undefined) => {
    switch (status) {
      case 'in_progress':
        // 履修予定 = 黄色
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'completed':
        // 履修済み = 緑
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      default:
        // 未選択 = グレー
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  // 進捗状態のラベルを取得
  const getStatusLabel = (status: ProgressStatus | undefined) => {
    switch (status) {
      case 'in_progress':
        return '履修予定';
      case 'completed':
        return '履修済み';
      default:
        return '未選択';
    }
  };

  // データをカテゴリ・項目・フェーズでグループ化
  const groupedData = items.reduce((acc, item) => {
    const key = `${item.category}|${item.item}`;
    if (!acc[key]) {
      acc[key] = {
        category: item.category,
        item: item.item,
        subCategory: item.subCategory,
        phases: {} as Record<number, SkillPhaseItem[]>,
      };
    }
    if (!acc[key].phases[item.phase]) {
      acc[key].phases[item.phase] = [];
    }
    acc[key].phases[item.phase].push(item);
    return acc;
  }, {} as Record<string, {
    category: string;
    item: string;
    subCategory: string;
    phases: Record<number, SkillPhaseItem[]>;
  }>);

  const groupedArray = Object.values(groupedData);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">
          スキルマスタデータがありません
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* ヘッダー：凡例と保存ボタン */}
      {!readOnly && (
        <div className="mb-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">凡例:</span>
            {/* 未選択（グレー） */}
            <div className={`px-4 py-2 rounded-lg ${getStatusStyle('not_started')}`}>
              未選択
            </div>
            {/* 履修予定（黄色） */}
            <div className={`px-4 py-2 rounded-lg ${getStatusStyle('in_progress')}`}>
              履修予定
            </div>
            {/* 履修済み（緑） */}
            <div className={`px-4 py-2 rounded-lg ${getStatusStyle('completed')}`}>
              履修済み
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">編集中</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-left">
                大分類
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-left">
                項目
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-left">
                中分類
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                フェーズ1
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                フェーズ2
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                フェーズ3
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                フェーズ4
              </th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                フェーズ5
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedArray.map((group, groupIndex) => (
              <tr key={`${group.category}-${group.item}-${groupIndex}`}>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {group.category}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {group.item}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {group.subCategory}
                </td>
                {[1, 2, 3, 4, 5].map((phase) => {
                  const phaseItems = group.phases[phase] || [];
                  if (phaseItems.length === 0) {
                    return (
                      <td
                        key={phase}
                        className="border border-gray-300 dark:border-gray-600 p-2"
                      />
                    );
                  }

                  return (
                    <td
                      key={phase}
                      className="border border-gray-300 dark:border-gray-600 p-2"
                    >
                      {phaseItems.map((item) => {
                        const itemStatus = localProgress.get(item.id); // ローカル状態を使用

                        return (
                          <div
                            key={item.id}
                            className={`mb-1 last:mb-0 p-2 rounded transition-colors ${
                              getStatusStyle(itemStatus)
                            } ${readOnly ? 'cursor-default' : saving ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-80'}`}
                            onClick={() => !readOnly && !saving && cycleProgress(item.id)}
                            title={`${item.name} - ${getStatusLabel(itemStatus)}${readOnly ? '' : ' (クリックで変更)'}`}
                          >
                            <div className="text-xs font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-xs mt-1 opacity-75">{item.description}</div>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

