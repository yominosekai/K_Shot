// 認証関連の型定義

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  department_id?: string;
  department?: string;
  role: 'admin' | 'instructor' | 'user' | 'training';
  is_active: boolean;
  created_date: string;
  last_login: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  certifications?: string[];
  mos?: string[];
}

/**
 * セッション用の軽量なUser型（Cookieに保存するため、大きなデータは除外）
 */
export interface SessionUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: 'admin' | 'instructor' | 'user' | 'training';
  is_active: boolean;
  last_login: string; // 最終ログイン時刻（フロントエンド側での更新判定に使用）
  // avatar、bio、skills等は除外（サーバーから再取得）
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

