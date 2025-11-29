// 個別コメント表示コンポーネント

import { Edit, Trash2, Reply, Link as LinkIcon, Lock, Globe } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import type { MaterialCommentNormalized } from '@/features/comments/types';
import type { MaterialNormalized } from '@/features/materials/types';
import { useUsers } from '@/contexts/UsersContext';

interface CommentItemProps {
  comment: MaterialCommentNormalized;
  material: MaterialNormalized | null;
  depth: number;
  userCache: Map<string, any>;
  currentUserId?: string;
  editingCommentId: string | null;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onEdit: (commentId: string) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string) => void;
  submitting: boolean;
}

export default function CommentItem({
  comment,
  material,
  depth,
  userCache,
  currentUserId,
  editingCommentId,
  editContent,
  onEditContentChange,
  onEdit,
  onCancelEdit,
  onDelete,
  onReply,
  submitting,
}: CommentItemProps) {
  const { getAvatarUrl } = useUsers();
  const commentUser = userCache.get(comment.created_by);
  const isOwnComment = comment.created_by === currentUserId;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {(() => {
              const avatarUrl = commentUser?.id ? getAvatarUrl(commentUser.id) : null;
              return avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={commentUser.display_name || 'Avatar'}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                  unoptimized={false}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {commentUser?.display_name?.charAt(0).toUpperCase() || comment.created_by?.charAt(0).toUpperCase() || 'U'}
                </div>
              );
            })()}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {commentUser?.display_name || comment.created_by || 'Unknown User'}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(comment.created_date)}</span>
                {comment.is_private ? (
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>非公開</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>公開</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {isOwnComment && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  onEditContentChange(comment.content);
                  onEdit(comment.id);
                }}
                className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                aria-label="編集"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                aria-label="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 編集フォーム */}
        {editingCommentId === comment.id ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={3}
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(comment.id)}
                disabled={submitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                保存
              </button>
              <button
                onClick={onCancelEdit}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* コメント内容 */}
            <div className="prose dark:prose-invert max-w-none mb-3 text-gray-900 dark:text-gray-100">
              <ReactMarkdown 
                remarkPlugins={[remarkBreaks]}
                components={{
                  p: ({ children }) => <p className="text-gray-900 dark:text-gray-100">{children}</p>,
                  h1: ({ children }) => <h1 className="text-gray-900 dark:text-gray-100">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-gray-900 dark:text-gray-100">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-gray-900 dark:text-gray-100">{children}</h3>,
                  strong: ({ children }) => <strong className="text-gray-900 dark:text-gray-100">{children}</strong>,
                  code: ({ children }) => <code className="text-gray-900 dark:text-gray-100">{children}</code>,
                  li: ({ children }) => <li className="text-gray-900 dark:text-gray-100">{children}</li>,
                }}
              >
                {comment.content}
              </ReactMarkdown>
            </div>

            {/* 添付ファイル */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">添付ファイル:</div>
                <div className="space-y-1">
                  {comment.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={`/api/materials/${material?.id}/comments/${comment.id}/attachments/${attachment.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {attachment.original_filename || attachment.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* リンク */}
            {comment.links && comment.links.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">関連資料:</div>
                <div className="space-y-1">
                  {comment.links.map((link, index) => (
                    <a
                      key={index}
                      href={`/materials?material=${link.material_id}`}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{link.material_title || link.material_id}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 返信ボタン */}
            {depth < 2 && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1 mt-2"
              >
                <Reply className="w-3 h-3" />
                <span>返信</span>
              </button>
            )}
          </>
        )}

        {/* 返信コメント */}
                {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                material={material}
                depth={depth + 1}
                userCache={userCache}
                currentUserId={currentUserId}
                editingCommentId={editingCommentId}
                editContent={editContent}
                onEditContentChange={onEditContentChange}
                onEdit={onEdit}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                onReply={onReply}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



