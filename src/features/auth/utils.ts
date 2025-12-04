// 認証関連のユーティリティ関数（クライアント側で使用可能）

/**
 * 権限チェック関数
 * @param user ユーザーオブジェクト
 * @param permission 必要な権限
 * @returns 権限があるかどうか
 */
export function checkPermission(
  user: { role: string; is_active: boolean } | null,
  permission: string
): boolean {
  if (!user || !user.is_active) return false;

  switch (permission) {
    case 'admin':
      return user.role === 'admin';
    case 'instructor':
      return user.role === 'admin' || user.role === 'instructor';
    case 'training':
      // 教育訓練ロール専用の権限。
      // 管理者は全権限を含む想定のため、training権限も付与する。
      return user.role === 'admin' || user.role === 'training';
    case 'user':
      return true;
    default:
      return false;
  }
}

