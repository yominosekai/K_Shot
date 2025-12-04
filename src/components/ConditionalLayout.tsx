// 条件付きレイアウトコンポーネント（setupページではHeader/Sidebarを非表示）

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFullscreen } from '@/contexts/FullscreenContext';
import Header from './Header';
import Sidebar from './Sidebar';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();
  const { isFullscreen } = useFullscreen();
  
  // /setupページの場合はHeader/Sidebarを表示しない
  if (pathname === '/setup') {
    return <>{children}</>;
  }

  // 認証チェック中は何も表示しない（通常画面を一瞬も表示させないため）
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 最大化時はHeader/Sidebarを非表示
  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
        <main className="w-full h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // 通常のレイアウト
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

