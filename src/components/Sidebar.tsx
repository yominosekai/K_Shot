'use client';

import { Home, FileText, BarChart, Settings, Users, Trash2, Database, AlertTriangle, Heart, MessageSquare, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isPilotTestEnabled } from '@/config/pilot-test';

const navigation = [
  { id: 'home', icon: Home, label: 'ホーム', href: '/' },
  { id: 'materials', icon: FileText, label: 'ナレッジ', href: '/materials' },
  { id: 'favorites', icon: Heart, label: 'お気に入り', href: '/favorites' },
  { id: 'members', icon: Users, label: '利用者一覧', href: '/members' },
];

const settingsNavigation = [
  { id: 'settings', icon: Settings, label: '設定', href: '/admin' },
];

const adminNavigation = [
  { id: 'database', icon: Database, label: 'データベース', href: '/admin/database' },
  { id: 'logs', icon: AlertTriangle, label: 'エラーチェック', href: '/admin/logs' },
  { id: 'admin-feedback', icon: MessageSquare, label: 'ご意見・ご要望管理', href: '/admin/feedback' },
  // パイロットテスト統計（機能フラグで制御）
  ...(isPilotTestEnabled()
    ? [{ id: 'pilot-feedback-stats', icon: ClipboardCheck, label: 'パイロットテスト統計', href: '/admin/pilot-feedback-stats' }]
    : []),
];

const trashNavigation = [
  { id: 'trash', icon: Trash2, label: 'ゴミ箱', href: '/trash' },
];

const feedbackNavigation = [
  { id: 'feedback', icon: MessageSquare, label: 'ご意見・ご要望', href: '/feedback' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto p-4">
      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* 利用状況（管理者のみ） */}
        {isAdmin && (
          <Link
            href="/overview"
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/overview' || pathname?.startsWith('/overview')
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart className="w-5 h-5" />
            <span className="font-medium">利用状況</span>
          </Link>
        )}
      </nav>

      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        {settingsNavigation.map((item) => {
          const Icon = item.icon;
          // アクティブ判定：/adminの場合は完全一致のみ（/admin/database、/admin/logs、/admin/feedbackと競合しないように）
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            // アクティブ判定：完全一致、または子パスの場合はstartsWithを使用
            // ただし、/adminの場合は完全一致のみ（/admin/database、/admin/logs、/admin/feedbackと競合しないように）
            let isActive = pathname === item.href;
            if (!isActive && item.href !== '/' && item.href !== '/admin') {
              isActive = pathname?.startsWith(item.href) || false;
            }
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        {trashNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        {feedbackNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

