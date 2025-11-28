// ヘッダー検索バーコンポーネント

'use client';

import { Search, X } from 'lucide-react';
import SearchDropdown from '@/components/SearchDropdown';

interface HeaderSearchBarProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  isSearchDropdownOpen: boolean;
  onSearchDropdownClose: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearch: (query: string) => void;
  onMaterialClick: (materialId: string) => void;
  onUserClick: (userSid: string) => void;
}

export default function HeaderSearchBar({
  searchValue,
  onSearchValueChange,
  isSearchDropdownOpen,
  onSearchDropdownClose,
  searchInputRef,
  onSearch,
  onMaterialClick,
  onUserClick,
}: HeaderSearchBarProps) {
  return (
    <div className="flex-grow flex justify-center">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="資料、メンバーを検索..."
          value={searchValue}
          onChange={(e) => {
            onSearchValueChange(e.target.value);
          }}
          onFocus={() => {
            // フォーカス時はドロップダウンを開く（親コンポーネントで制御）
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue.trim()) {
              onSearch(searchValue.trim());
            } else if (e.key === 'Escape') {
              onSearchDropdownClose();
            }
          }}
          className="pl-10 pr-10 py-2 w-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        {searchValue && (
          <button
            onClick={() => {
              onSearchValueChange('');
              onSearchDropdownClose();
              searchInputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="クリア"
          >
            <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}
        <SearchDropdown
          isOpen={isSearchDropdownOpen}
          onClose={onSearchDropdownClose}
          searchValue={searchValue}
          onSearchValueChange={onSearchValueChange}
          onSearch={onSearch}
          onMaterialClick={onMaterialClick}
          onUserClick={onUserClick}
        />
      </div>
    </div>
  );
}

