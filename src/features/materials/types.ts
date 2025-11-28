// 共有資料関連の型定義

/**
 * 資料タイプ（動的に追加されるためstringに変更）
 */
export type MaterialType = string;

/**
 * 共有資料（CSVから読み込む基本情報）
 */
export interface Material {
  id: string;
  uuid: string;
  title: string;
  description: string;
  category_id: string;
  type: MaterialType;
  difficulty?: string; // 難易度（beginner/intermediate/advanced）
  estimated_hours?: string; // 推定学習時間（CSVでは文字列）
  tags: string; // CSVではカンマ区切り文字列
  folder_path: string; // フォルダパス（例: "セキュリティ基礎/2024年度/演習"）
  created_by: string; // SID
  created_date: string; // ISO 8601
  updated_date: string; // ISO 8601
  is_published: string; // CSVでは 'true'/'false' 文字列
  views: string; // CSVでは文字列
  likes: string; // CSVでは文字列
}

/**
 * 共有資料（正規化後、フロントエンドで使用）
 */
export interface MaterialNormalized {
  id: string;
  uuid: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string; // カテゴリ名（結合後）
  type: MaterialType;
  difficulty?: string; // 難易度（beginner/intermediate/advanced）
  estimated_hours?: number; // 推定学習時間（数値に変換）
  tags: string[]; // 配列に変換
  folder_path: string; // フォルダパス
  created_by: string;
  created_by_name?: string; // 作成者名（結合後）
  created_date: string;
  updated_date: string;
  is_published: boolean;
  views: number;
  likes: number;
  bookmark_count?: number; // お気に入り数（一括取得時）
  comment_count?: number; // コメント数（一括取得時）
  is_liked?: boolean; // いいね済みか（一括取得時）
  // 追加情報（詳細取得時）
  document?: string; // document.mdの内容
  attachments?: Attachment[];
  // ユーザー固有情報
  is_bookmarked?: boolean; // お気に入り登録済みか
  progress?: MaterialProgress; // 進捗情報
}

/**
 * 添付ファイル
 */
export interface Attachment {
  filename: string; // 保存時のファイル名（安全化されたファイル名）
  original_filename?: string; // 元のファイル名（2バイト文字を含む場合）
  size: number;
  type: string;
  relativePath?: string; // フォルダ構造を保持するための相対パス（例: "images/logo.png" または "documents/2024/report.pdf"）
}

/**
 * 資料更新履歴
 */
export interface MaterialRevision {
  id: string;
  material_id: string;
  version: number;
  updated_by: string;
  updated_by_name?: string;
  comment?: string;
  updated_date: string;
}

/**
 * 資料の進捗情報
 */
export interface MaterialProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number; // 0-100
  last_viewed_date?: string;
  notes?: string;
}

/**
 * 資料の詳細メタデータ（metadata.json）
 */
export interface MaterialMetadata {
  id: string;
  uuid: string;
  title: string;
  description: string;
  category_id: string;
  type: MaterialType;
  difficulty?: string; // 難易度（beginner/intermediate/advanced）
  estimated_hours?: number | string; // 推定学習時間
  tags: string[];
  created_by: string;
  created_date: string;
  updated_date: string;
  is_published: boolean;
  views: number;
  likes: number;
  attachments?: Attachment[];
}

/**
 * カテゴリ
 */
export interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string; // 空文字列の場合はルート
  level: string; // CSVでは文字列
  created_date: string;
}

/**
 * カテゴリ（正規化後）
 */
export interface CategoryNormalized {
  id: string;
  name: string;
  description: string;
  parent_id: string;
  level: number;
  created_date: string;
  children?: CategoryNormalized[]; // 階層構造用
}

/**
 * 資料検索・フィルター条件
 */
export interface MaterialFilter {
  search?: string; // タイトル・説明の検索
  category_id?: string;
  type?: MaterialType;
  tags?: string[]; // タグでフィルター
  created_by?: string; // 作成者でフィルター
  folder_path?: string; // フォルダパスでフィルター
  is_published?: boolean;
  sort_by?: 'created_date' | 'updated_date' | 'title' | 'views' | 'likes';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  since?: string; // 差分更新用：この時刻以降に更新されたもののみ取得（ISO 8601形式）
  include_bookmark_counts?: boolean; // お気に入り数を含めるかどうか
  user_sid?: string; // いいね状態を取得するユーザーSID
}

/**
 * フォルダ（CSVから読み込む基本情報）
 */
export interface Folder {
  id: string;
  name: string;
  parent_id: string; // 空文字列の場合はルート
  path: string; // フルパス（例: "セキュリティ基礎/2024年度"）
  created_by: string; // SID
  created_date: string; // ISO 8601
}

/**
 * フォルダ（正規化後、フロントエンドで使用）
 */
export interface FolderNormalized {
  id: string;
  name: string;
  parent_id: string;
  path: string;
  created_by: string;
  created_by_name?: string; // 作成者名（結合後）
  created_date: string;
  children?: FolderNormalized[]; // 階層構造用
  material_count?: number; // このフォルダ内の資料数
}

/**
 * 階層ブラウザのエントリ
 */
export interface FolderEntry {
  id: string;
  name: string;
  type: 'folder' | 'material';
  path: string;
  material?: MaterialNormalized; // typeが'material'の場合
}

