// バックアップ設定セクション（管理者専用）

'use client';

import { Database, Save, Clock } from 'lucide-react';
import type { BackupSettings } from '@/shared/lib/utils/backup-settings';

interface BackupSettingsProps {
  backupSettings: BackupSettings;
  isSaving: boolean;
  onBackupSettingsChange: (settings: BackupSettings) => void;
  onSave: () => void;
}

export default function BackupSettingsSection({
  backupSettings,
  isSaving,
  onBackupSettingsChange,
  onSave,
}: BackupSettingsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Database className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">データベースバックアップ設定</h3>
      </div>
      <div className="space-y-4">
        {/* 自動バックアップ有効/無効 */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={backupSettings.enabled}
              onChange={(e) =>
                onBackupSettingsChange({ ...backupSettings, enabled: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              自動バックアップを有効にする
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
            ページが開いている間、設定された時間に自動的にバックアップを実行します（12:00-18:00の間のみ）
          </p>
        </div>

        {/* 保存先 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            保存先（相対パス）
          </label>
          <input
            type="text"
            value={backupSettings.savePath}
            onChange={(e) =>
              onBackupSettingsChange({ ...backupSettings, savePath: e.target.value })
            }
            placeholder="backups"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            デフォルト: backups（{`{DATA_DIR}/backups/`}に保存されます）
          </p>
        </div>

        {/* 実行時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            実行時間
          </label>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <input
              type="time"
              value={backupSettings.executionTime}
              onChange={(e) =>
                onBackupSettingsChange({ ...backupSettings, executionTime: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            12:00-18:00の間の時間を設定してください（デフォルト: 12:00）
          </p>
        </div>

        {/* 保存期間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            保存期間
          </label>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {backupSettings.retentionDays}日（固定）
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            30日以上前のバックアップは自動的に削除されます
          </p>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? '保存中...' : '設定を保存'}</span>
        </button>
      </div>
    </div>
  );
}


