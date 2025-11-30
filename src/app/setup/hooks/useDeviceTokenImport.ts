// 初期設定ページの証明ファイルインポート処理フック

import { useState, useRef, useCallback } from 'react';

export function useDeviceTokenImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('JSONファイルを選択してください');
      return;
    }

    try {
      setImporting(true);
      setImportError(null);
      setImportSuccess(false);

      const text = await file.text();
      const deviceTokenFile = JSON.parse(text);

      // 必須フィールドの検証
      const requiredFields = ['schema_version', 'token', 'signature', 'user_id', 'issued_at'];
      for (const field of requiredFields) {
        if (!deviceTokenFile[field]) {
          throw new Error(`必須フィールドが不足しています: ${field}`);
        }
      }

      const response = await fetch('/api/users/device-tokens/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_token_file: deviceTokenFile }),
      });

      const data = await response.json();

      if (data.success) {
        setImportSuccess(true);
        // ファイル入力をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setImportError(data.error || '証明ファイルのインポートに失敗しました');
      }
    } catch (err) {
      console.error('証明ファイルインポートエラー:', err);
      setImportError(
        err instanceof Error
          ? err.message
          : '証明ファイルの読み込みに失敗しました'
      );
    } finally {
      setImporting(false);
    }
  }, []);

  return {
    fileInputRef,
    importing,
    importError,
    importSuccess,
    handleFileImport,
  };
}
