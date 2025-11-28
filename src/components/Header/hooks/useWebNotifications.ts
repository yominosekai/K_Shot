// Web Notifications API管理のカスタムフック

import { useCallback } from 'react';

interface UseWebNotificationsProps {
  onNotificationClick?: (newCount: number, previousCount: number) => void;
}

/**
 * Web Notifications APIを管理するフック
 */
export function useWebNotifications({ onNotificationClick }: UseWebNotificationsProps = {}) {
  /**
   * 通知を表示
   */
  const showNotification = useCallback(
    (title: string, body: string, icon?: string, newCount?: number, previousCount?: number) => {
      if (!('Notification' in window)) {
        return;
      }

      // 通知許可を確認
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: icon || '/logo.svg',
          tag: 'notification',
        });

        // 通知をクリックしたらコールバックを実行
        if (onNotificationClick && newCount !== undefined && previousCount !== undefined) {
          notification.onclick = () => {
            window.focus();
            onNotificationClick(newCount, previousCount);
            notification.close();
          };
        }
      } else if (Notification.permission === 'default') {
        // 許可を求める
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            const notification = new Notification(title, {
              body,
              icon: icon || '/favicon.ico',
              tag: 'notification',
            });

            if (onNotificationClick && newCount !== undefined && previousCount !== undefined) {
              notification.onclick = () => {
                window.focus();
                onNotificationClick(newCount, previousCount);
                notification.close();
              };
            }
          }
        });
      }
    },
    [onNotificationClick]
  );

  /**
   * 通知許可を要求（初回のみ）
   */
  const requestPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    showNotification,
    requestPermission,
  };
}

