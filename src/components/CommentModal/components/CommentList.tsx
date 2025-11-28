// コメント一覧表示コンポーネント

import CommentItem from './CommentItem';
import type { MaterialCommentNormalized } from '@/features/comments/types';
import type { MaterialNormalized } from '@/features/materials/types';

interface CommentListProps {
  comments: MaterialCommentNormalized[];
  material: MaterialNormalized | null;
  loading: boolean;
  userCache: Map<string, any>;
  currentUserSid?: string;
  editingCommentId: string | null;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onEdit: (commentId: string) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string) => void;
  submitting: boolean;
}

export default function CommentList({
  comments,
  material,
  loading,
  userCache,
  currentUserSid,
  editingCommentId,
  editContent,
  onEditContentChange,
  onEdit,
  onCancelEdit,
  onDelete,
  onReply,
  submitting,
}: CommentListProps) {
  if (loading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">読み込み中...</div>;
  }

  if (comments.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400">まだコメントがありません</div>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          material={material}
          depth={0}
          userCache={userCache}
          currentUserSid={currentUserSid}
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
  );
}



