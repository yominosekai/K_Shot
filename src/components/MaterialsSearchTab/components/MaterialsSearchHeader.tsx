// 資料検索ヘッダーコンポーネント

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface MaterialsSearchHeaderProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

const DEBOUNCE_DELAY = 300; // デバウンス時間（ミリ秒）

export default function MaterialsSearchHeader({
  searchTerm,
  onSearchTermChange,
}: MaterialsSearchHeaderProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 外部からsearchTermが変更された場合（例：クリア時）にローカル状態を同期
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // デバウンスされた検索実行
  const executeSearch = (term: string) => {
    // 既存のタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // 新しいタイマーを設定
    debounceTimerRef.current = setTimeout(() => {
      onSearchTermChange(term);
      debounceTimerRef.current = null;
    }, DEBOUNCE_DELAY);
  };

  // 即時検索実行（エンターキー用）
  const executeSearchImmediately = (term: string) => {
    // デバウンスタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // 即座に検索実行
    onSearchTermChange(term);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    executeSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearchImmediately(localSearchTerm);
    }
  };

  const handleClear = () => {
    setLocalSearchTerm('');
    executeSearchImmediately('');
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="資料を検索..."
          value={localSearchTerm}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        {localSearchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}


