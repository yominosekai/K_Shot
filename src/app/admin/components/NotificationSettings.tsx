// 通知設定セクション

'use client';

import { Bell, Save } from 'lucide-react';
import {
  NOTIFICATION_INTERVAL_OPTIONS,
  type NotificationInterval,
} from '@/shared/lib/utils/notification-settings';

interface NotificationSettingsProps {
  notificationInterval: NotificationInterval;
  backgroundNotificationEnabled: boolean;
  isSaving: boolean;
  onNotificationIntervalChange: (interval: NotificationInterval) => void;
  onBackgroundNotificationEnabledChange: (enabled: boolean) => void;
  onSave: () => void;
}

export default function NotificationSettings({
  notificationInterval,
  backgroundNotificationEnabled,
  isSaving,
  onNotificationIntervalChange,
  onBackgroundNotificationEnabledChange,
  onSave,
}: NotificationSettingsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Bell className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">通知設定</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            通知頻度
          </label>
          <select
            value={notificationInterval}
            onChange={(e) => onNotificationIntervalChange(e.target.value as NotificationInterval)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {NOTIFICATION_INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            通知のチェック間隔を設定します。「即座」を選択した場合、ページを開いた時とフォーカスした時のみチェックします。
          </p>
        </div>
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={backgroundNotificationEnabled}
              onChange={(e) => onBackgroundNotificationEnabledChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              バックグラウンドでの通知確認
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
            チェックを入れると、タブが非表示の時も通知を確認します。チェックを外すと、タブが表示されている時のみ通知を確認します（推奨）。
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? '保存中...' : '保存'}</span>
        </button>
      </div>
    </div>
  );
}


