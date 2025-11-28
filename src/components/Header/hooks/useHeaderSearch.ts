// ヘッダー検索機能のカスタムフック

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/contexts/SearchContext';
import type { MaterialNormalized } from '@/features/materials/types';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface UseHeaderSearchProps {
  userSid?: string;
  onMaterialClick?: (material: MaterialNormalized) => void;
  onUserClick?: (user: UserType) => void;
}

export function useHeaderSearch({ userSid, onMaterialClick, onUserClick }: UseHeaderSearchProps) {
  const router = useRouter();
  const { registerSetSearchValueAndFocus } = useSearch();
  const [searchValue, setSearchValue] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { getUser: getUserFromContext } = useUsers();

  // 検索欄の値を設定しフォーカスする関数をContextに登録
  useEffect(() => {
    const setSearchValueAndFocus = (value: string) => {
      setSearchValue(value);
      setIsSearchDropdownOpen(true);
      // 次のフレームでフォーカス（状態更新後に実行）
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 0);
    };
    registerSetSearchValueAndFocus(setSearchValueAndFocus);
  }, [registerSetSearchValueAndFocus]);

  // 検索を実行
  const handleSearch = (query: string) => {
    if (!query || query.trim().length === 0) return;

    // 検索結果ページに遷移（または検索結果を表示）
    router.push(`/materials?search=${encodeURIComponent(query)}&tab=search`);
    setIsSearchDropdownOpen(false);
  };

  // 資料をクリックした時の処理
  const handleMaterialClick = async (materialId: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}${userSid ? `?user_sid=${userSid}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          if (onMaterialClick) {
            onMaterialClick(data.material);
          }
          setIsSearchDropdownOpen(false);
        }
      }
    } catch (err) {
      console.error('資料詳細取得エラー:', err);
    }
  };

  // ユーザーをクリックした時の処理
  const handleUserClick = async (userSid: string) => {
    try {
      const user = await getUserFromContext(userSid);
      if (user) {
        if (onUserClick) {
          onUserClick(user);
        }
        setIsSearchDropdownOpen(false);
      }
    } catch (err) {
      console.error('ユーザー詳細取得エラー:', err);
    }
  };

  return {
    searchValue,
    setSearchValue,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    searchInputRef,
    handleSearch,
    handleMaterialClick,
    handleUserClick,
  };
}


