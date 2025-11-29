// コメントモーダルコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { MaterialNormalized } from '@/features/materials/types';
import { useComments } from './CommentModal/hooks/useComments';
import { useCommentForm } from './CommentModal/hooks/useCommentForm';
import { useCommentActions } from './CommentModal/hooks/useCommentActions';
import CommentList from './CommentModal/components/CommentList';
import CommentForm from './CommentModal/components/CommentForm';

interface CommentModalProps {
  material: MaterialNormalized | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (materialId: string) => void;
}

export default function CommentModal({
  material,
  isOpen,
  onClose,
  onCommentAdded,
}: CommentModalProps) {
  const { user } = useAuth();
  
  // カスタムフックでデータ取得と状態管理
  const { comments, loading, userCache, refetch: refetchComments } = useComments(material, isOpen);
  const {
    content,
    setContent,
    isPrivate,
    setIsPrivate,
    parentCommentId,
    setParentCommentId,
    attachments,
    links,
    showLinkInput,
    setShowLinkInput,
    linkMaterialId,
    setLinkMaterialId,
    fileInputRef,
    linkInputRef,
    reset: resetForm,
    handleFileSelect,
    handleRemoveAttachment,
    handleRemoveLink,
    handleAddLink,
    startReply,
  } = useCommentForm();
  
  const {
    submitting,
    editingCommentId,
    setEditingCommentId,
    editContent,
    setEditContent,
    handleSubmit: handleSubmitAction,
    handleEdit,
    handleDelete,
  } = useCommentActions(material, onCommentAdded, refetchComments);

  // モーダルが閉じられた時にフォームをリセット
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setEditingCommentId(null);
      setEditContent('');
    }
  }, [isOpen, resetForm, setEditingCommentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitAction(content, isPrivate, parentCommentId, attachments, links, fileInputRef);
    resetForm();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReply = (commentId: string) => {
    startReply(commentId);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  if (!isOpen || !material) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {material.title} - コメント
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="閉じる"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* コメント一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          <CommentList
            comments={comments}
            material={material}
            loading={loading}
            userCache={userCache}
            currentUserId={user?.id}
            editingCommentId={editingCommentId}
            editContent={editContent}
            onEditContentChange={setEditContent}
            onEdit={handleEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDelete}
            onReply={handleReply}
            submitting={submitting}
          />
        </div>

        {/* コメント投稿フォーム */}
        <CommentForm
          content={content}
          onContentChange={setContent}
          isPrivate={isPrivate}
          onIsPrivateChange={setIsPrivate}
          parentCommentId={parentCommentId}
          onCancelReply={() => setParentCommentId(null)}
          attachments={attachments}
          links={links}
          showLinkInput={showLinkInput}
          linkMaterialId={linkMaterialId}
          onLinkMaterialIdChange={setLinkMaterialId}
          onShowLinkInputChange={setShowLinkInput}
          onAddLink={handleAddLink}
          onRemoveAttachment={handleRemoveAttachment}
          onRemoveLink={handleRemoveLink}
          onFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          linkInputRef={linkInputRef}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}

