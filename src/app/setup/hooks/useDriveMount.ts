// 初期設定ページのマウント処理フック

import { useState, useCallback } from 'react';

interface UseDriveMountProps {
  networkPath: string;
  driveLetter: string;
  setFolderExists: (exists: boolean | null) => void;
  setCreateFolder: (create: boolean) => void;
}

export function useDriveMount({
  networkPath,
  driveLetter,
  setFolderExists,
  setCreateFolder,
}: UseDriveMountProps) {
  const [mounting, setMounting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleMount = useCallback(async () => {
    if (!networkPath || !driveLetter) {
      setError('ネットワークパスとドライブレターを入力してください');
      return;
    }

    setMounting(true);
    setError(null);
    setSuccess(null);
    setFolderExists(null);

    try {
      const response = await fetch('/api/setup/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkPath, driveLetter }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'マウントが完了しました');
        setFolderExists(data.folderExists !== undefined ? data.folderExists : null);
        if (data.alreadyMounted) {
          // 既にマウントされている場合
          setFolderExists(data.folderExists !== undefined ? data.folderExists : null);
        }
        if (data.folderExists === false) {
          setCreateFolder(true);
        }
      } else {
        setError(data.error || 'マウントに失敗しました');
      }
    } catch (err) {
      console.error('マウントエラー:', err);
      setError('マウント処理中にエラーが発生しました');
    } finally {
      setMounting(false);
    }
  }, [networkPath, driveLetter, setFolderExists, setCreateFolder]);

  return {
    mounting,
    error,
    success,
    handleMount,
    setError,
    setSuccess,
  };
}
