// 自動バックアップフック

import { useEffect, useRef } from 'react';
import { getBackupSettings } from '@/shared/lib/utils/backup-settings';
import { useAuth } from '@/contexts/AuthContext';

const LAST_BACKUP_DATE_KEY = 'last_auto_backup_date';

/**
 * 自動バックアップを実行するフック
 * ページが開いている間、設定された時間にバックアップを実行
 */
export function useAutoBackup() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBackupDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }

    const settings = getBackupSettings();
    if (!settings.enabled) {
      return;
    }

    // 最後のバックアップ日を取得
    if (typeof window !== 'undefined') {
      lastBackupDateRef.current = localStorage.getItem(LAST_BACKUP_DATE_KEY);
    }

    // 実行時間をパース（HH:mm形式）
    const [hours, minutes] = settings.executionTime.split(':').map(Number);
    const executionHour = hours;
    const executionMinute = minutes;

    // バックアップ実行関数
    const executeBackup = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // 今日既にバックアップを実行している場合はスキップ
      if (lastBackupDateRef.current === today) {
        return;
      }

      // 実行時間帯のチェック（12:00-18:00）
      const currentHour = now.getHours();
      if (currentHour < 12 || currentHour >= 18) {
        return;
      }

      // 実行時間のチェック（指定された時間の±30分以内）
      const currentMinute = now.getMinutes();
      const timeDiff = Math.abs(
        currentHour * 60 + currentMinute - (executionHour * 60 + executionMinute)
      );

      if (timeDiff > 30) {
        return; // 実行時間の±30分以内でない場合はスキップ
      }

      try {
        // バックアップAPIを呼び出し
        const response = await fetch('/api/admin/backup/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            savePath: settings.savePath,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // 最後のバックアップ日を更新
            if (typeof window !== 'undefined') {
              localStorage.setItem(LAST_BACKUP_DATE_KEY, today);
              lastBackupDateRef.current = today;
            }
            console.log('自動バックアップが完了しました');
          }
        }
      } catch (err) {
        console.error('自動バックアップエラー:', err);
      }
    };

    // 初回チェック
    executeBackup();

    // 5分ごとにチェック（実行時間帯の間のみ）
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // 12:00-18:00の間のみチェック
      if (currentHour >= 12 && currentHour < 18) {
        executeBackup();
      }
    }, 5 * 60 * 1000); // 5分間隔

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);
}

