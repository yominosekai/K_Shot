/**
 * パイロットテスト機能の設定
 * 
 * この機能は一時的なもので、テスト終了後は削除・分離・非公開できるように設計されています。
 * 機能を無効化する場合は、このファイルの ENABLED を false に設定してください。
 */

export const PILOT_TEST_CONFIG = {
  // 機能の有効/無効
  ENABLED: true,
  
  // パイロットテスト期間の識別子（例: "2025-01"）
  PERIOD: '2025-01',
  
  // メニュー項目の表示名
  MENU_LABEL: 'パイロットテスト評価',
  
  // 統計画面へのアクセス権限（管理者のみ）
  STATS_ADMIN_ONLY: true,
} as const;

/**
 * パイロットテスト機能が有効かどうかを確認
 */
export function isPilotTestEnabled(): boolean {
  return PILOT_TEST_CONFIG.ENABLED;
}

