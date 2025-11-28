// バックアップ・復元セクション（管理者専用）

'use client';

import { useState, useRef } from 'react';
import { Database, Upload } from 'lucide-react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

export default function BackupRestoreSection() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmDialog = useConfirmDialog();

  // データベースバックアップ（手動）
  const handleBackupDatabase = async () => {
    const confirmed = await confirmDialog({
      title: 'バックアップの実行',
      message: 'データベースをバックアップしますか？',
      confirmText: 'バックアップする',
      cancelText: 'キャンセル',
    });
    if (!confirmed) {
      return;
    }

    try {
      setBackupLoading(true);
      const response = await fetch('/api/admin/backup');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `k_shot_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.db`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('バックアップが完了しました。');
      } else {
        const data = await response.json();
        alert(data.error || 'バックアップに失敗しました。');
      }
    } catch (err) {
      console.error('バックアップエラー:', err);
      alert('バックアップに失敗しました。');
    } finally {
      setBackupLoading(false);
    }
  };

  // データベース復元
  const handleRestoreDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.db')) {
      alert('データベースファイル（.db）のみアップロード可能です。');
      return;
    }

    const confirmMessage = `データベースを復元しますか？\n\n⚠️ 警告:\n- 現在のデータベースが完全に上書きされます\n- 復元前に自動バックアップが作成されます\n- 復元後、ページをリロードしてください\n- この操作は取り消せません\n\n続行しますか？`;

    const confirmed = await confirmDialog({
      title: 'データベース復元',
      message: confirmMessage,
      confirmText: '復元する',
      cancelText: 'キャンセル',
      variant: 'danger',
    });

    if (!confirmed) {
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setRestoreLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(
            `データベースの復元が完了しました。\n復元前のバックアップ: ${data.preRestoreBackup}\n\nページをリロードしてください。`
          );
          // ページをリロード
          window.location.reload();
        } else {
          alert(data.error || '復元に失敗しました。');
        }
      } else {
        const data = await response.json();
        alert(data.error || '復元に失敗しました。');
      }
    } catch (err) {
      console.error('復元エラー:', err);
      alert('復元に失敗しました。');
    } finally {
      setRestoreLoading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Database className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">データベースバックアップ・復元</h3>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            データベースのバックアップファイルをダウンロード、または復元します。
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackupDatabase}
              disabled={backupLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {backupLoading ? 'バックアップ中...' : 'バックアップをダウンロード'}
            </button>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 inline mr-2" />
              {restoreLoading ? '復元中...' : '復元（インポート）'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".db"
                onChange={handleRestoreDatabase}
                className="hidden"
                disabled={restoreLoading}
              />
            </label>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            ⚠️ 復元時は現在のデータベースが上書きされます。復元前に自動バックアップが作成されます。
          </p>
        </div>
      </div>
    </div>
  );
}


