// 初期設定ページの保存処理フック

import { useState, useCallback } from 'react';
import { SessionManager } from '@/features/auth/utils/session';

interface UseSetupSaveProps {
  networkPath: string;
  driveLetter: string;
  folderExists: boolean | null;
  createFolder: boolean;
}

const clearClientCaches = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('folders_cache');
    localStorage.removeItem('folders_cache_timestamp');
    localStorage.removeItem('categories_cache');
    localStorage.removeItem('categories_cache_timestamp');
    localStorage.removeItem('users_cache');
    localStorage.removeItem('materials_last_fetch_time');
    localStorage.removeItem('materials_last_filter_key');
  } catch (err) {
    console.warn('[Setup] ローカルキャッシュのクリアに失敗しました', err);
  }

  try {
    const sessionManager = SessionManager.getInstance();
    sessionManager.clearSession();
  } catch (err) {
    console.warn('[Setup] セッションのクリアに失敗しました', err);
  }
};

export function useSetupSave({
  networkPath,
  driveLetter,
  folderExists,
  createFolder,
}: UseSetupSaveProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!networkPath || !driveLetter) {
      setError('ネットワークパスとドライブレターを入力してください');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkPath,
          driveLetter,
          createFolder: folderExists === false && createFolder,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        clearClientCaches();
        if (typeof window !== 'undefined') {
          localStorage.setItem('setup_completed', 'true');
        }
        setSuccess('設定が完了しました。ページをリロードします...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(data.error || '設定の保存に失敗しました');
      }
    } catch (err) {
      console.error('保存エラー:', err);
      setError('設定の保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  }, [networkPath, driveLetter, folderExists, createFolder]);

  return {
    saving,
    error,
    success,
    handleSave,
    setError,
    setSuccess,
  };
}
