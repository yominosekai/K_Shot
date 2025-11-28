// コメント機能の型定義

/**
 * コメントの添付ファイル
 */
export interface CommentAttachment {
  filename: string;
  original_filename?: string;
  size: number;
  type: string;
  relativePath?: string;
}

/**
 * コメントのリンク
 */
export interface CommentLink {
  material_id: string;
  material_title?: string;
}

/**
 * コメント
 */
export interface MaterialComment {
  id: string;
  material_id: string;
  parent_comment_id: string | null;
  created_by: string;
  content: string;
  is_private: boolean;
  attachments: CommentAttachment[];
  links: CommentLink[];
  created_date: string;
  updated_date: string;
}

/**
 * 正規化されたコメント（ユーザー情報を含む）
 */
export interface MaterialCommentNormalized extends MaterialComment {
  created_by_name?: string;
  created_by_avatar?: string;
  can_view: boolean; // 現在のユーザーがこのコメントを見られるか
  can_edit: boolean; // 現在のユーザーがこのコメントを編集できるか
  can_delete: boolean; // 現在のユーザーがこのコメントを削除できるか
  replies?: MaterialCommentNormalized[]; // 返信コメント
}

