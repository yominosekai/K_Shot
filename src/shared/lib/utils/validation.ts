// 入力検証ユーティリティ

import { validateSID } from '@/features/auth/utils';

/**
 * SIDの検証
 * @param sid 検証するSID
 * @returns 有効なSIDの場合はtrue、それ以外はfalse
 */
export function isValidSID(sid: string): boolean {
  if (!sid || typeof sid !== 'string') {
    return false;
  }
  return validateSID(sid);
}

/**
 * ユーザーIDの検証（SIDと同じ形式）
 * @param userId 検証するユーザーID
 * @returns 有効なユーザーIDの場合はtrue、それ以外はfalse
 */
export function isValidUserId(userId: string): boolean {
  return isValidSID(userId);
}

/**
 * 文字列の検証（空文字列、null、undefinedを拒否）
 * @param value 検証する値
 * @param minLength 最小長（オプション）
 * @param maxLength 最大長（オプション）
 * @returns 有効な文字列の場合はtrue、それ以外はfalse
 */
export function isValidString(
  value: string | null | undefined,
  minLength?: number,
  maxLength?: number
): boolean {
  if (value === null || value === undefined || typeof value !== 'string') {
    return false;
  }

  if (minLength !== undefined && value.length < minLength) {
    return false;
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return false;
  }

  return true;
}

/**
 * 数値の検証
 * @param value 検証する値
 * @param min 最小値（オプション）
 * @param max 最大値（オプション）
 * @returns 有効な数値の場合はtrue、それ以外はfalse
 */
export function isValidNumber(
  value: number | string | null | undefined,
  min?: number,
  max?: number
): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return false;
  }

  if (min !== undefined && num < min) {
    return false;
  }

  if (max !== undefined && num > max) {
    return false;
  }

  return true;
}

/**
 * 整数の検証
 * @param value 検証する値
 * @param min 最小値（オプション）
 * @param max 最大値（オプション）
 * @returns 有効な整数の場合はtrue、それ以外はfalse
 */
export function isValidInteger(
  value: number | string | null | undefined,
  min?: number,
  max?: number
): boolean {
  if (!isValidNumber(value, min, max)) {
    return false;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isInteger(num);
}

/**
 * メールアドレスの検証（簡易版）
 * @param email 検証するメールアドレス
 * @returns 有効なメールアドレスの場合はtrue、それ以外はfalse
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!isValidString(email)) {
    return false;
  }

  // 簡易的なメールアドレス検証（@が含まれ、@の前後に文字がある）
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email!);
}

/**
 * 日付文字列の検証（ISO 8601形式）
 * @param dateString 検証する日付文字列
 * @returns 有効な日付文字列の場合はtrue、それ以外はfalse
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  if (!isValidString(dateString)) {
    return false;
  }

  const date = new Date(dateString!);
  return !isNaN(date.getTime());
}







