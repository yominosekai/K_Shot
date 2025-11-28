// 検索ドロップダウンコンポーネント

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUsers } from '@/contexts/UsersContext';

interface SearchSuggestion {
  id?: string;
  sid?: string;
  title?: string;
  display_name?: string;
  username?: string;
  email?: string;
  type?: string;
  folder_path?: string;
  role?: string;
  type_label: 'material' | 'user';
}

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  onMaterialClick?: (materialId: string) => void;
  onUserClick?: (userSid: string) => void;
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

export default function SearchDropdown({
  isOpen,
  onClose,
  searchValue,
  onSearchValueChange,
  onSearch,
  onMaterialClick,
  onUserClick,
}: SearchDropdownProps) {
  const router = useRouter();
  const { getAvatarUrl } = useUsers();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shouldSkipFetchRef = useRef(false); // エンターキーで検索実行時は候補取得をスキップ

  // 検索履歴を読み込む
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        try {
          setSearchHistory(JSON.parse(history));
        } catch {
          setSearchHistory([]);
        }
      }
    }
  }, []);

  // 検索候補を取得
  useEffect(() => {
    if (!isOpen) return;

    // エンターキーで検索実行時は候補取得をスキップ
    if (shouldSkipFetchRef.current) {
      shouldSkipFetchRef.current = false;
      return;
    }

    const fetchSuggestions = async () => {
      if (!searchValue || searchValue.trim().length === 0) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchValue)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const materialSuggestions: SearchSuggestion[] = (data.materials || []).map((m: any) => ({
              id: m.id,
              title: m.title,
              type: m.type,
              folder_path: m.folder_path,
              type_label: 'material' as const,
            }));

            const userSuggestions: SearchSuggestion[] = (data.users || []).map((u: any) => ({
              sid: u.sid,
              display_name: u.display_name,
              username: u.username,
              email: u.email,
              role: u.role,
              type_label: 'user' as const,
            }));

            setSuggestions([...materialSuggestions, ...userSuggestions]);
          }
        }
      } catch (err) {
        console.error('検索候補取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    // デバウンス（300ms）
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchValue, isOpen]);

  // 外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 検索履歴に追加
  const addToHistory = (query: string) => {
    if (!query || query.trim().length === 0) return;

    const trimmedQuery = query.trim();
    setSearchHistory((prev) => {
      const newHistory = [trimmedQuery, ...prev.filter((q) => q !== trimmedQuery)].slice(0, MAX_HISTORY_ITEMS);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      }
      return newHistory;
    });
  };

  // 検索を実行
  const handleSearch = (query: string) => {
    if (!query || query.trim().length === 0) return;

    // エンターキーで検索実行時は候補取得をスキップ
    shouldSkipFetchRef.current = true;
    addToHistory(query);
    onSearch(query);
    onClose();
  };

  // 検索履歴から削除
  const removeFromHistory = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const newHistory = prev.filter((q) => q !== query);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      }
      return newHistory;
    });
  };

  // 候補をクリック
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type_label === 'material' && suggestion.id) {
      if (onMaterialClick) {
        onMaterialClick(suggestion.id);
      } else {
        // フォールバック: モーダルが使えない場合は画面遷移
        router.push(`/materials?material=${suggestion.id}`);
      }
    } else if (suggestion.type_label === 'user' && suggestion.sid) {
      if (onUserClick) {
        onUserClick(suggestion.sid);
      } else {
        // フォールバック: モーダルが使えない場合は画面遷移
        router.push(`/members`);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const showHistory = !searchValue || searchValue.trim().length === 0;
  const showSuggestions = searchValue && searchValue.trim().length > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] overflow-y-auto"
    >
      {/* 検索履歴 */}
      {showHistory && searchHistory.length > 0 && (
        <div className="py-2">
          {searchHistory.map((query, index) => (
            <div
              key={index}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <button
                onClick={() => {
                  onSearchValueChange(query);
                  // 検索欄に入力するだけで、検索は実行しない
                }}
                className="flex items-center space-x-3 flex-1 min-w-0 text-left"
              >
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{query}</span>
              </button>
              <button
                onClick={(e) => removeFromHistory(query, e)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="履歴から削除"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 検索候補 */}
      {showSuggestions && (
        <div className="py-2">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              検索中...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              検索結果が見つかりませんでした
            </div>
          ) : (
            <div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {suggestion.type_label === 'material' ? (
                    <>
                      <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {suggestion.title}
                        </p>
                        {suggestion.folder_path && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {suggestion.folder_path}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                        {(() => {
                          if (!suggestion.sid) {
                            return suggestion.display_name?.charAt(0) || suggestion.username?.charAt(0) || 'U';
                          }
                          const avatarUrl = getAvatarUrl(suggestion.sid);
                          return avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={suggestion.display_name || suggestion.username || 'Avatar'}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              unoptimized={false}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            suggestion.display_name?.charAt(0) || suggestion.username?.charAt(0) || 'U'
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {suggestion.display_name || suggestion.username}
                        </p>
                        {suggestion.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {suggestion.email}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* フッター */}
      {searchHistory.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-end">
          <button
            onClick={() => {
              setSearchHistory([]);
              if (typeof window !== 'undefined') {
                localStorage.removeItem(SEARCH_HISTORY_KEY);
              }
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            履歴をクリア
          </button>
        </div>
      )}
    </div>
  );
}

