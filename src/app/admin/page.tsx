'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotificationIntervalValue,
  setNotificationInterval,
  getBackgroundNotificationEnabled,
  setBackgroundNotificationEnabled,
  type NotificationInterval,
} from '@/shared/lib/utils/notification-settings';
import {
  getBackupSettings,
  setBackupSettings,
  type BackupSettings,
} from '@/shared/lib/utils/backup-settings';
import NetworkDriveSettings from './components/NetworkDriveSettings';
import NotificationSettings from './components/NotificationSettings';
import DataManagementSettings from './components/DataManagementSettings';
import BackupSettingsSection from './components/BackupSettings';
import BackupRestoreSection from './components/BackupRestoreSection';
import PasswordManagementSection from './components/PasswordManagementSection';
import AccountManagementSection from './components/AccountManagementSection';

export default function AdminPage() {
  const { user } = useAuth();
  const [notificationInterval, setNotificationIntervalState] = useState<NotificationInterval>('5');
  const [backgroundNotificationEnabled, setBackgroundNotificationEnabledState] = useState<boolean>(false);
  const [driveConfig, setDriveConfig] = useState<{ networkPath?: string; driveLetter?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [backupSettings, setBackupSettingsState] = useState<BackupSettings>({
    enabled: false,
    savePath: 'backups',
    executionTime: '12:00',
    retentionDays: 30,
  });
  const [isSavingBackupSettings, setIsSavingBackupSettings] = useState(false);

  // 通知頻度の設定を読み込む
  useEffect(() => {
    const currentInterval = getNotificationIntervalValue();
    setNotificationIntervalState(currentInterval);
    const backgroundEnabled = getBackgroundNotificationEnabled();
    setBackgroundNotificationEnabledState(backgroundEnabled);
  }, []);

  // バックアップ設定を読み込む
  useEffect(() => {
    const settings = getBackupSettings();
    setBackupSettingsState(settings);
  }, []);

  // ドライブ設定を読み込む
  useEffect(() => {
    const fetchDriveConfig = async () => {
      try {
        const response = await fetch('/api/setup/check');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setDriveConfig({
              networkPath: data.config.networkPath,
              driveLetter: data.config.driveLetter,
            });
          }
        }
      } catch (err) {
        console.error('ドライブ設定取得エラー:', err);
      }
    };
    fetchDriveConfig();
  }, []);

  // 通知設定を保存
  const handleSaveNotificationInterval = () => {
    setIsSaving(true);
    setNotificationInterval(notificationInterval);
    setBackgroundNotificationEnabled(backgroundNotificationEnabled);
    setTimeout(() => {
      setIsSaving(false);
      alert('通知設定を保存しました。');
    }, 500);
  };

  // バックアップ設定を保存
  const handleSaveBackupSettings = () => {
    setIsSavingBackupSettings(true);
    setBackupSettings(backupSettings);
    setTimeout(() => {
      setIsSavingBackupSettings(false);
      alert('バックアップ設定を保存しました。');
    }, 500);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full">
        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">設定</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">システム設定の変更</p>
        </div>

        <div className="space-y-6">
          {/* ネットワークドライブ設定 */}
          <NetworkDriveSettings driveConfig={driveConfig} />

          {/* 通知設定 */}
          <NotificationSettings
            notificationInterval={notificationInterval}
            backgroundNotificationEnabled={backgroundNotificationEnabled}
            isSaving={isSaving}
            onNotificationIntervalChange={setNotificationIntervalState}
            onBackgroundNotificationEnabledChange={setBackgroundNotificationEnabledState}
            onSave={handleSaveNotificationInterval}
          />

          {/* データ管理 */}
          <DataManagementSettings />

          {/* 管理者専用セクション */}
          {isAdmin && (
            <>
              {/* アカウント管理 */}
              <AccountManagementSection />

              {/* パスワード管理 */}
              <PasswordManagementSection />

              {/* データベースバックアップ設定 */}
              <BackupSettingsSection
                backupSettings={backupSettings}
                isSaving={isSavingBackupSettings}
                onBackupSettingsChange={setBackupSettingsState}
                onSave={handleSaveBackupSettings}
              />

              {/* データベースバックアップ・復元 */}
              <BackupRestoreSection />
            </>
          )}
        </div>
      </div>

    </div>
  );
}
