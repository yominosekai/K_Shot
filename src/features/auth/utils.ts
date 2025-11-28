// 認証関連のユーティリティ関数（クライアント側で使用可能）

/**
 * SID形式の検証
 * @param sid SID文字列
 * @returns 有効なSID形式かどうか
 */
export function validateSID(sid: string): boolean {
  const sidPattern = /^S-1-5-21-\d+-\d+-\d+-\d+$/;
  return sidPattern.test(sid);
}

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
    case 'user':
      return true;
    default:
      return false;
  }
}

