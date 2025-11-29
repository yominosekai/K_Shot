// 通知ポーリング管理のカスタムフック

import { useState, useEffect } from 'react';
import { getNotificationInterval, getBackgroundNotificationEnabled } from '@/shared/lib/utils/notification-settings';
import { useConnectionStatus, type ConnectionStatus } from './useConnectionStatus';
import { useWebNotifications } from './useWebNotifications';

// ConnectionStatus型を再エクスポート（後方互換性のため）
export type { ConnectionStatus };

interface UseNotificationPollingProps {
  userId: string | undefined;
  onNotificationCountChange: (count: number) => void;
  onNotificationReceived?: (count: number, previousCount: number) => void;
}

export function useNotificationPolling({
  userId,
  onNotificationCountChange,
  onNotificationReceived,
}: UseNotificationPollingProps) {
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date | null>(null);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);

  // 接続状態管理
  const { connectionStatus, updateStatus } = useConnectionStatus();

  // Web Notifications API管理
  const { showNotification, requestPermission } = useWebNotifications({
    onNotificationClick: (newCount, previousCount) => {
      if (onNotificationReceived) {
        onNotificationReceived(newCount, previousCount);
      }
    },
  });

  // 通知数の取得（軽量APIを使用）
  const fetchNotificationCount = async () => {
    if (!userId) return;

    try {
      const encodedId = encodeURIComponent(userId);
      // 軽量API: 未読数カウントのみを取得
      const response = await fetch(`/api/users/${encodedId}/notifications/count`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 接続成功
          updateStatus('online');

          const newCount = data.unreadCount || 0;
          const previousCount = previousNotificationCount;
          
          // 新しい通知があった場合、Web Notifications APIで通知を表示
          if (newCount > previousCount && onNotificationReceived) {
            // 新規通知検出時のみ通知一覧APIを呼び出して詳細を取得
            try {
              const detailResponse = await fetch(`/api/users/${encodedId}/notifications?unread_only=true&limit=1`);
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                if (detailData.success) {
                  // 最新の通知を取得（通知一覧の最初の要素）
                  const latestNotification = detailData.notifications && detailData.notifications.length > 0 
                    ? detailData.notifications[0] 
                    : null;
                  
                  // 通知のタイトルとメッセージを設定
                  const notificationTitle = latestNotification?.title || '新しい通知があります';
                  const notificationBody = latestNotification?.message || `${newCount - previousCount}件の新しい通知があります`;
                  
                  // Web Notifications APIで通知を表示
                  showNotification(notificationTitle, notificationBody, '/logo.svg', newCount, previousCount);
                }
              }
            } catch (detailErr) {
              // 詳細取得エラーは無視（カウントは更新済み）
              console.error('通知詳細取得エラー:', detailErr);
            }
          }

          onNotificationCountChange(newCount);
          setPreviousNotificationCount(newCount);
          setLastNotificationCheck(new Date());
        } else {
          // レスポンスは成功したが、データが不正
          updateStatus('offline');
        }
      } else {
        // HTTPエラー
        updateStatus('offline');
      }
    } catch (err) {
      // ネットワークエラーなど
      updateStatus('offline');
      console.error('通知数取得エラー:', err);
    }
  };

  // 初回読み込み時と設定された間隔で通知数を取得
  useEffect(() => {
    if (!userId) return;

    // 即座の場合はポーリングしない（ページフォーカス時のみ取得）
    let interval: NodeJS.Timeout | null = null;
    
    // ポーリングを開始する関数（常に最新の設定値を取得）
    const startPolling = () => {
      const pollingInterval = getNotificationInterval();
      const backgroundEnabled = getBackgroundNotificationEnabled();
      
      // 既存のインターバルをクリア（重複防止）
      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      if (pollingInterval === 0) {
        updateStatus('disabled');
        return;
      }

      updateStatus('online');
      interval = setInterval(() => {
        // バックグラウンド通知設定がONの場合は常にポーリング
        // OFFの場合はタブが表示されている場合のみポーリング
        if (backgroundEnabled || document.visibilityState === 'visible') {
          fetchNotificationCount();
        }
      }, pollingInterval);
    };

    // ポーリングを停止する関数
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // 初回取得とポーリング開始
    fetchNotificationCount();
    startPolling();

    // visibilitychangeイベントが最近発火したかどうかを追跡（重複実行を防ぐ）
    let lastVisibilityChangeTime = 0;
    const VISIBILITY_CHANGE_DEBOUNCE = 100; // 100ms以内の重複を無視

    // Page Visibility API: タブの表示/非表示を監視
    const handleVisibilityChange = () => {
      const now = Date.now();
      lastVisibilityChangeTime = now;

      if (document.visibilityState === 'visible') {
        // タブが表示された時
        const backgroundEnabled = getBackgroundNotificationEnabled();
        if (backgroundEnabled) {
          // 設定ONの場合: バックグラウンドで既に確認しているため、即座に確認しない
          // ポーリングは既に動いているので再開は不要（設定変更時のみ再開）
        } else {
          // 設定OFFの場合: バックグラウンドで確認していないため、即座に確認する
          fetchNotificationCount();
        }
        // ポーリングを再開（最新の設定値で）
        startPolling();
      } else {
        // タブが非表示になった時: バックグラウンド通知設定を確認
        const backgroundEnabled = getBackgroundNotificationEnabled();
        if (!backgroundEnabled) {
          // 設定がOFFの場合はポーリングを停止（デフォルト動作）
          stopPolling();
        }
        // 設定がONの場合はポーリングを継続（何もしない）
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ページがフォーカスされた時にも取得（visibilitychangeが発火していない場合のみ）
    const handleFocus = () => {
      const now = Date.now();
      // visibilitychangeイベントが最近発火していない場合のみ実行
      if (now - lastVisibilityChangeTime > VISIBILITY_CHANGE_DEBOUNCE) {
        fetchNotificationCount();
        // フォアグラウンド復帰時にポーリングを再開（最新の設定値で）
        if (document.visibilityState === 'visible') {
          startPolling();
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    // 設定変更を監視（カスタムイベント）
    const handleIntervalChange = () => {
      // 設定が変更された時: ポーリングを再設定（最新の設定値で）
      stopPolling();
      startPolling();
    };
    window.addEventListener('notificationIntervalChanged', handleIntervalChange);

    // バックグラウンド通知設定変更を監視
    const handleBackgroundSettingChange = () => {
      // 設定が変更された時: 現在の状態に応じてポーリングを調整
      const backgroundEnabled = getBackgroundNotificationEnabled();
      if (document.visibilityState === 'hidden' && !backgroundEnabled) {
        // バックグラウンドで設定がOFFになった場合: ポーリングを停止
        stopPolling();
      } else if (document.visibilityState === 'hidden' && backgroundEnabled) {
        // バックグラウンドで設定がONになった場合: ポーリングを再開
        startPolling();
      }
    };
    window.addEventListener('backgroundNotificationSettingChanged', handleBackgroundSettingChange);

    // Web Notifications APIの許可を求める（初回のみ）
    requestPermission();

    return () => {
      stopPolling();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('notificationIntervalChanged', handleIntervalChange);
      window.removeEventListener('backgroundNotificationSettingChanged', handleBackgroundSettingChange);
    };
  }, [userId]);

  return {
    connectionStatus,
    lastNotificationCheck,
    fetchNotificationCount,
  };
}

