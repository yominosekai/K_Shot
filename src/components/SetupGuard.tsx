// 初期設定ガードコンポーネント

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // /setupページとAPI Routeは除外
    if (pathname === '/setup' || pathname.startsWith('/api/')) {
      setIsChecking(false);
      setShouldRedirect(false); // リダイレクト状態をリセット
      return;
    }

    // 常にAPIを呼び出して最新の状態を確認（localStorageのキャッシュは信頼しない）
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/setup/check');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.isSetupCompleted) {
              // 設定完了状態をlocalStorageに保存
              if (typeof window !== 'undefined') {
                localStorage.setItem('setup_completed', 'true');
              }
              setIsChecking(false);
              setShouldRedirect(false);
            } else {
              // 初期設定が未完了の場合はlocalStorageをクリアして/setupにリダイレクト
              if (typeof window !== 'undefined') {
                localStorage.removeItem('setup_completed');
              }
              setShouldRedirect(true);
              router.push('/setup');
              return;
            }
          } else {
            // APIが失敗した場合も/setupにリダイレクト
            if (typeof window !== 'undefined') {
              localStorage.removeItem('setup_completed');
            }
            setShouldRedirect(true);
            router.push('/setup');
            return;
          }
        } else {
          // HTTPエラーの場合も/setupにリダイレクト
          if (typeof window !== 'undefined') {
            localStorage.removeItem('setup_completed');
          }
          setShouldRedirect(true);
          router.push('/setup');
          return;
        }
      } catch (err) {
        console.error('初期設定確認エラー:', err);
        // エラーが発生した場合もlocalStorageをクリアして/setupにリダイレクト（安全側に倒す）
        if (typeof window !== 'undefined') {
          localStorage.removeItem('setup_completed');
        }
        setShouldRedirect(true);
        router.push('/setup');
        return;
      }
    };

    checkSetup();
  }, [pathname, router]);

  // リダイレクト中は何も表示しない（ただし、/setupページの場合は表示しない）
  if (shouldRedirect && pathname !== '/setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">初期設定ページに移動中...</p>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

