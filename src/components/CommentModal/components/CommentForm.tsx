// コメント投稿フォームコンポーネント

'use client';

import { Paperclip, Link as LinkIcon, X, Lock, Globe, Send } from 'lucide-react';
import type { CommentAttachment, CommentLink } from '@/features/comments/types';

interface CommentFormProps {
  content: string;
  onContentChange: (content: string) => void;
  isPrivate: boolean;
  onIsPrivateChange: (isPrivate: boolean) => void;
  parentCommentId: string | null;
  onCancelReply: () => void;
  attachments: CommentAttachment[];
  links: CommentLink[];
  showLinkInput: boolean;
  linkMaterialId: string;
  onLinkMaterialIdChange: (id: string) => void;
  onShowLinkInputChange: (show: boolean) => void;
  onAddLink: () => void;
  onRemoveAttachment: (index: number) => void;
  onRemoveLink: (index: number) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  linkInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export default function CommentForm({
  content,
  onContentChange,
  isPrivate,
  onIsPrivateChange,
  parentCommentId,
  onCancelReply,
  attachments,
  links,
  showLinkInput,
  linkMaterialId,
  onLinkMaterialIdChange,
  onShowLinkInputChange,
  onAddLink,
  onRemoveAttachment,
  onRemoveLink,
  onFileSelect,
  fileInputRef,
  linkInputRef,
  onSubmit,
  submitting,
}: CommentFormProps) {

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
      {/* 返信時の表示 */}
      {parentCommentId && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300">返信を投稿しています</span>
          <button
            onClick={onCancelReply}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            aria-label="返信をキャンセル"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        {/* コメント入力エリア */}
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="コメントを入力..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />

        {/* 添付ファイル一覧 */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm"
              >
                <Paperclip className="w-3 h-3" />
                <span className="text-gray-700 dark:text-gray-300">{attachment.original_filename || attachment.filename}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(index)}
                  className="text-gray-500 hover:text-red-500"
                  aria-label="添付を削除"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* リンク一覧 */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((link, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-sm"
              >
                <LinkIcon className="w-3 h-3" />
                <span className="text-blue-700 dark:text-blue-300">{link.material_title}</span>
                <button
                  type="button"
                  onClick={() => onRemoveLink(index)}
                  className="text-blue-500 hover:text-red-500"
                  aria-label="リンクを削除"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* リンク入力 */}
        {showLinkInput && (
          <div className="flex items-center space-x-2">
            <input
              ref={linkInputRef}
              type="text"
              value={linkMaterialId}
              onChange={(e) => onLinkMaterialIdChange(e.target.value)}
              placeholder="資料IDを入力"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={onAddLink}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => onShowLinkInputChange(false)}
              className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              キャンセル
            </button>
          </div>
        )}

        {/* ツールバー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* ファイル添付ボタン */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="ファイルを添付"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFileSelect}
              className="hidden"
            />

            {/* リンク追加ボタン */}
            <button
              type="button"
              onClick={() => onShowLinkInputChange(!showLinkInput)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="資料へのリンクを追加"
            >
              <LinkIcon className="w-5 h-5" />
            </button>

            {/* プライベート/公開切り替え */}
            <button
              type="button"
              onClick={() => onIsPrivateChange(!isPrivate)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                isPrivate
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}
            >
              {isPrivate ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">非公開</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">公開</span>
                </>
              )}
            </button>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? '送信中...' : '送信'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
