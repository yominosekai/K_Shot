// データ管理セクション

'use client';

import { useState, useRef } from 'react';
import { Trash2, ChevronDown, ChevronUp, Upload, Smartphone } from 'lucide-react';
import { clearActivityHistory } from '@/shared/lib/utils/activity-history';
import { useUsers } from '@/contexts/UsersContext';
import { useFolders } from '@/contexts/FoldersContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

const SEARCH_HISTORY_KEY = 'search_history';

interface CacheCategory {
  id: string;
  label: string;
  description: string;
  items: string[];
}

const CACHE_CATEGORIES: CacheCategory[] = [
  {
    id: 'data',
    label: 'データキャッシュ',
    description: 'アプリケーションの動作に必要なデータのキャッシュ',
    items: [
      'ユーザー情報とアバター',
      'フォルダ一覧',
      'カテゴリ一覧',
      '資料検索結果',
      'アクティビティデータ',
    ],
  },
  {
    id: 'memory',
    label: 'メモリキャッシュ',
    description: 'メモリ上に保持されているキャッシュ',
    items: [
      'ユーザー情報（メモリ）',
      'フォルダ一覧（メモリ）',
      'カテゴリ一覧（メモリ）',
      '資料検索結果（メモリ）',
      '作成者情報（メモリ）',
    ],
  },
  {
    id: 'settings',
    label: 'アプリケーション設定',
    description: '機能に関する設定',
    items: [
      '通知設定',
      'バックアップ設定',
      'セットアップ状態',
    ],
  },
  {
    id: 'ui',
    label: 'UI設定',
    description: '画面表示に関する設定',
    items: [
      'テーマ（ダーク/ライトモード）',
      'メンバー表示モード',
      '資料表示モード',
      'お気に入り表示モード',
    ],
  },
  {
    id: 'history',
    label: '履歴データ',
    description: 'ユーザーの操作履歴',
    items: [
      '閲覧履歴',
      '検索履歴',
    ],
  },
];

export default function DataManagementSettings() {
  const { invalidateCache: invalidateUsersCache } = useUsers();
  const { invalidateCache: invalidateFoldersCache } = useFolders();
  const { invalidateCache: invalidateCategoriesCache } = useCategories();
  const confirmDialog = useConfirmDialog();
  
  // デフォルトでデータキャッシュとメモリキャッシュをチェック
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['data', 'memory'])
  );
  const [isOtherItemsExpanded, setIsOtherItemsExpanded] = useState(false);

  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  // デフォルトでチェックされている項目
  const defaultCheckedCategories = CACHE_CATEGORIES.filter(c => 
    c.id === 'data' || c.id === 'memory'
  );
  
  // その他の項目（デフォルトでチェックされていない項目）
  const otherCategories = CACHE_CATEGORIES.filter(c => 
    c.id !== 'data' && c.id !== 'memory'
  );

  const handleClearCache = async () => {
    if (selectedCategories.size === 0) {
      alert('クリアする項目を選択してください。');
      return;
    }

    const categoryNames = CACHE_CATEGORIES
      .filter(c => selectedCategories.has(c.id))
      .map(c => c.label)
      .join('、');

    const confirmed = await confirmDialog({
      title: 'キャッシュをクリア',
      message: `選択したキャッシュをクリアしますか？\n\n${categoryNames}\n\nこの操作は取り消せません。`,
      confirmText: 'クリアする',
      cancelText: 'キャンセル',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      // 1. データキャッシュ
      if (selectedCategories.has('data')) {
        // ユーザー情報キャッシュ
        if (typeof window !== 'undefined') {
          localStorage.removeItem('users_cache');
        }
        invalidateUsersCache();

        // フォルダ一覧キャッシュ
        localStorage.removeItem('folders_cache');
        localStorage.removeItem('folders_cache_timestamp');
        invalidateFoldersCache();

        // カテゴリ一覧キャッシュ
        localStorage.removeItem('categories_cache');
        localStorage.removeItem('categories_cache_timestamp');
        invalidateCategoriesCache();

        // 資料検索結果キャッシュ
        localStorage.removeItem('materials_last_fetch_time');
        localStorage.removeItem('materials_last_filter_key');

        // アクティビティデータキャッシュ（動的キー）
        if (typeof window !== 'undefined') {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('analytics:users:')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      }

      // 2. 履歴データ
      if (selectedCategories.has('history')) {
        clearActivityHistory();
        if (typeof window !== 'undefined') {
          localStorage.removeItem(SEARCH_HISTORY_KEY);
        }
      }

      // 3. UI設定
      if (selectedCategories.has('ui')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('theme');
          localStorage.removeItem('members_viewMode');
          localStorage.removeItem('materials_viewMode');
          localStorage.removeItem('favorites_viewMode');
        }
      }

      // 4. アプリケーション設定
      if (selectedCategories.has('settings')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('notification_polling_interval');
          localStorage.removeItem('background_notification_enabled');
          localStorage.removeItem('backup_settings');
          localStorage.removeItem('last_backup_date');
          localStorage.removeItem('setup_completed');
        }
      }

      // 5. メモリキャッシュ
      if (selectedCategories.has('memory')) {
        // Contextのキャッシュは既に上記で無効化済み
        // メモリキャッシュはページリロードでクリアされる
        // 明示的にクリアする場合はページリロードを推奨
        if (typeof window !== 'undefined') {
          const shouldReload = await confirmDialog({
            title: 'リロードの確認',
            message:
              'メモリキャッシュを完全にクリアするには、ページのリロードが必要です。\n\n今すぐリロードしますか？',
            confirmText: 'リロードする',
            cancelText: 'あとで',
          });
          if (shouldReload) {
            window.location.reload();
            return;
          }
        }
      }

      alert('キャッシュをクリアしました。');
      setSelectedCategories(new Set());
    } catch (err) {
      console.error('キャッシュクリアエラー:', err);
      alert('キャッシュのクリア中にエラーが発生しました。');
    }
  };

  // デバイストークンインポート機能
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('JSONファイルを選択してください');
      return;
    }

    try {
      setImporting(true);
      setImportError(null);
      setImportSuccess(false);

      const text = await file.text();
      const deviceTokenFile = JSON.parse(text);

      // 必須フィールドの検証
      const requiredFields = ['schema_version', 'token', 'signature', 'user_id', 'issued_at'];
      for (const field of requiredFields) {
        if (!deviceTokenFile[field]) {
          throw new Error(`必須フィールドが不足しています: ${field}`);
        }
      }

      const response = await fetch('/api/users/device-tokens/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_token_file: deviceTokenFile }),
      });

      const data = await response.json();

      if (data.success) {
        setImportSuccess(true);
        await confirmDialog({
          title: 'インポート完了',
          message: '証明ファイルをインポートしました。ページをリロードして認証状態を更新してください。',
          confirmText: 'OK',
          hideCancel: true,
          variant: 'info',
        });
        // ファイル入力をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // 3秒後に成功メッセージを消す
        setTimeout(() => {
          setImportSuccess(false);
        }, 3000);
      } else {
        setImportError(data.error || '証明ファイルのインポートに失敗しました');
      }
    } catch (err) {
      console.error('証明ファイルインポートエラー:', err);
      setImportError(
        err instanceof Error
          ? err.message
          : '証明ファイルの読み込みに失敗しました'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* デバイストークンインポート */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Smartphone className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">デバイストークン管理</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            管理者から受け取った証明ファイル（device-token.json）をインポートして、このデバイスで認証できるようにします。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-3">
            <button
              onClick={handleFileSelect}
              disabled={importing}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>{importing ? 'インポート中...' : '証明ファイルをインポート'}</span>
            </button>

            {importError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
              </div>
            )}

            {importSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  証明ファイルをインポートしました。ページをリロードしてください。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* データ管理 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">データ管理</h3>
      </div>
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          クリアする項目を選択してから「キャッシュをクリア」ボタンをクリックしてください。
        </p>

        {/* カテゴリリスト */}
        <div className="space-y-3">
          {/* デフォルトでチェックされている項目（常に表示） */}
          {defaultCheckedCategories.map((category) => (
            <div
              key={category.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={category.id}
                  checked={selectedCategories.has(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor={category.id}
                    className="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block mb-1"
                  >
                    {category.label}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {category.description}
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                    {category.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {/* その他の項目（折りたたみ可能） */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setIsOtherItemsExpanded(!isOtherItemsExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                その他の項目
              </span>
              {isOtherItemsExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            
            {isOtherItemsExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {otherCategories.map((category) => (
                  <div
                    key={category.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={category.id}
                        checked={selectedCategories.has(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={category.id}
                          className="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block mb-1"
                        >
                          {category.label}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {category.description}
                        </p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
                          {category.items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* クリアボタン */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClearCache}
            disabled={selectedCategories.size === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            キャッシュをクリア
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}


