// ヘッダーユーザーメニューコンポーネント

'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Shield, HelpCircle, Info, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { User as UserType } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface HeaderUserMenuProps {
  user: UserType | null;
  onRoleChangeClick: () => void;
}

export default function HeaderUserMenu({ user, onRoleChangeClick }: HeaderUserMenuProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { getAvatarUrl } = useUsers();

  // ユーザーメニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // メニューコンテナまたはボタン内のクリックは無視
      if (
        userMenuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      
      // 外部クリックの場合はメニューを閉じる
      setIsUserMenuOpen(false);
    };

    if (isUserMenuOpen) {
      // clickイベントを使用（mousedownより確実）
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isUserMenuOpen]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <div className="relative" ref={userMenuRef}>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="flex items-center space-x-2 sm:space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="ユーザーメニュー"
        aria-expanded={isUserMenuOpen}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
          {(() => {
            const avatarUrl = user?.id ? getAvatarUrl(user.id) : null;
            return avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized={false}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              user?.display_name?.charAt(0).toUpperCase() || 'U'
            );
          })()}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
          {user?.display_name}
        </span>
        <svg
          className="w-4 h-4 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ユーザーメニュードロップダウン */}
      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100]">
          <Link
            href="/profile"
            onClick={() => setIsUserMenuOpen(false)}
            className="flex items-center space-x-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>プロフィール</span>
          </Link>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            onClick={() => {
              onRoleChangeClick();
              setIsUserMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>権限変更</span>
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <Link
            href="/philosophy"
            onClick={() => setIsUserMenuOpen(false)}
            className="flex items-center space-x-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            <span>開発者の考え</span>
          </Link>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <Link
            href="/help"
            onClick={() => setIsUserMenuOpen(false)}
            className="flex items-center space-x-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>ヘルプ</span>
          </Link>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <Link
            href="/version"
            onClick={() => setIsUserMenuOpen(false)}
            className="flex items-center space-x-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>バージョン</span>
          </Link>
        </div>
      )}
    </div>
  );
}


