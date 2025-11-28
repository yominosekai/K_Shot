'use client';

import { useState, useEffect } from 'react';
import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import RoleChangeModal from '@/components/RoleChangeModal';
import NotificationModal from '@/components/NotificationModal';
import MaterialModal from '@/components/MaterialModal';
import UserDetailModal from '@/components/UserDetailModal';
import Link from 'next/link';
import Image from 'next/image';
import type { MaterialNormalized } from '@/features/materials/types';
import type { User as UserType } from '@/features/auth/types';
import { useAutoBackup } from '@/shared/hooks/useAutoBackup';
import { useNotificationPolling } from './Header/hooks/useNotificationPolling';
import { useHeaderSearch } from './Header/hooks/useHeaderSearch';
import HeaderSearchBar from './Header/components/HeaderSearchBar';
import HeaderUserMenu from './Header/components/HeaderUserMenu';
import ConnectionStatusIndicator from './Header/components/ConnectionStatusIndicator';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [isRoleChangeModalOpen, setIsRoleChangeModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // 通知ポーリング
  const { connectionStatus, fetchNotificationCount } = useNotificationPolling({
    userSid: user?.sid,
    onNotificationCountChange: (count) => {
      setUnreadNotificationCount(count);
    },
    onNotificationReceived: () => {
      setIsNotificationModalOpen(true);
    },
  });

  // 検索機能
  const {
    searchValue,
    setSearchValue,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    searchInputRef,
    handleSearch,
    handleMaterialClick: handleSearchMaterialClick,
    handleUserClick: handleSearchUserClick,
  } = useHeaderSearch({
    userSid: user?.sid,
    onMaterialClick: (material) => {
      setSelectedMaterial(material);
      setIsMaterialModalOpen(true);
    },
    onUserClick: (user) => {
      setSelectedUser(user);
      setIsUserModalOpen(true);
    },
  });

  // 通知モーダルを開いた時に通知数を再取得
  useEffect(() => {
    if (isNotificationModalOpen && user?.sid) {
      fetchNotificationCount();
    }
  }, [isNotificationModalOpen, user?.sid]);

  // 自動バックアップ（管理者のみ）
  useAutoBackup();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center w-full">
          {/* 左側: タイトル */}
          <div className="flex items-center flex-shrink-0 gap-8">
            <Link
              href="/"
              className="block cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <HeaderLogo theme={theme} />
            </Link>
            <Image
              src="/logo.png"
              alt="K Shot ロゴ"
              width={200}
              height={68}
              className="h-[68px] w-auto object-contain"
              style={{ width: 'auto', height: '68px' }}
              priority
            />
          </div>

          {/* 中央: 検索バー */}
          <HeaderSearchBar
            searchValue={searchValue}
            onSearchValueChange={(value) => {
              setSearchValue(value);
              setIsSearchDropdownOpen(true);
            }}
            isSearchDropdownOpen={isSearchDropdownOpen}
            onSearchDropdownClose={() => setIsSearchDropdownOpen(false)}
            searchInputRef={searchInputRef}
            onSearch={handleSearch}
            onMaterialClick={handleSearchMaterialClick}
            onUserClick={handleSearchUserClick}
          />
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="テーマを切り替え"
            >
              {theme === 'dark' ? (
                <Sun className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              ) : (
                <Moon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
              aria-label="通知"
            >
              <Bell className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
            {/* 接続状態インジケーター */}
            <ConnectionStatusIndicator status={connectionStatus} />
            <HeaderUserMenu
              user={user}
              onRoleChangeClick={() => setIsRoleChangeModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* 権限変更モーダル */}
      <RoleChangeModal
        isOpen={isRoleChangeModalOpen}
        onClose={() => setIsRoleChangeModalOpen(false)}
        currentUser={user}
        onSuccess={() => {
          // 権限変更成功時の処理（必要に応じて）
          window.location.reload(); // ユーザー情報を再取得するためにリロード
        }}
      />

      {/* 通知モーダル */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onNotificationRead={() => {
          // 通知が既読になったら通知数を再取得
          fetchNotificationCount();
        }}
      />

      {/* 資料モーダル */}
      <MaterialModal
        material={selectedMaterial}
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setSelectedMaterial(null);
        }}
      />

      {/* ユーザー詳細モーダル */}
      <UserDetailModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </header>
  );
}

function HeaderLogo({ theme }: { theme?: string | null }) {
  const logo =
    theme === 'dark'
      ? { src: '/kshot-header_dark.png', width: 1002, height: 249 }
      : { src: '/kshot-header_light.png', width: 1011, height: 247 };

  return (
    <Image
      src={logo.src}
      alt="K Shot"
      width={logo.width}
      height={logo.height}
      className="h-[68px] w-auto object-contain"
      style={{ width: 'auto', height: '68px' }}
      priority
    />
  );
}

