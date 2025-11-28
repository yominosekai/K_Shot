// バックアップ設定ユーティリティ（localStorage使用）

const BACKUP_SETTINGS_KEY = 'backup_settings';

export interface BackupSettings {
  enabled: boolean;
  savePath: string;
  executionTime: string; // HH:mm形式（例: "12:00"）
  retentionDays: number; // 保持期間（日数）
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: false,
  savePath: 'backups', // 相対パス（{DATA_DIR}/backups/）
  executionTime: '12:00',
  retentionDays: 30,
};

/**
 * バックアップ設定を取得
 */
export function getBackupSettings(): BackupSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const stored = localStorage.getItem(BACKUP_SETTINGS_KEY);
  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to parse backup settings from localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * バックアップ設定を保存
 */
export function setBackupSettings(settings: BackupSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * バックアップ設定をリセット（デフォルト値に戻す）
 */
export function resetBackupSettings(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
}

