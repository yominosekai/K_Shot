// コメント操作フック

'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { MaterialNormalized } from '@/features/materials/types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

export function useCommentActions(
  material: MaterialNormalized | null,
  onCommentAdded?: (materialId: string) => void,
  refetchComments?: () => Promise<void>
) {
  const { user } = useAuth();
  const confirmDialog = useConfirmDialog();
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = useCallback(async (
    content: string,
    isPrivate: boolean,
    parentCommentId: string | null,
    attachments: any[],
    links: any[],
    fileInputRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (!material || !user?.sid || !content.trim()) return;

    try {
      setSubmitting(true);

      // 添付ファイルをアップロード
      let uploadedAttachments: any[] = [];
      let tempCommentId: string | null = null;
      if (attachments.length > 0 && fileInputRef?.current?.files) {
        const formData = new FormData();
        tempCommentId = `temp_${Date.now()}`;
        formData.append('comment_id', tempCommentId);
        
        const files = Array.from(fileInputRef.current.files);
        files.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch(`/api/materials/${material.id}/comments/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.success) {
            uploadedAttachments = uploadData.attachments || [];
          }
        }
      }

      // コメントを作成
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('created_by', user.sid);
      formData.append('is_private', isPrivate.toString());
      if (parentCommentId) {
        formData.append('parent_comment_id', parentCommentId);
      }
      if (uploadedAttachments.length > 0) {
        formData.append('attachments', JSON.stringify(uploadedAttachments));
      }
      if (links.length > 0) {
        formData.append('links', JSON.stringify(links));
      }
      if (tempCommentId) {
        formData.append('temp_comment_id', tempCommentId);
      }

      const response = await fetch(`/api/materials/${material.id}/comments`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await refetchComments?.();
          if (material?.id) {
            onCommentAdded?.(material.id);
          }
        }
      }
    } catch (err) {
      console.error('コメント投稿エラー:', err);
    } finally {
      setSubmitting(false);
    }
  }, [material, user?.sid, onCommentAdded, refetchComments]);

  const handleEdit = useCallback(async (commentId: string) => {
    if (!material || !user?.sid || !editContent.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/materials/${material.id}/comments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_id: commentId,
          content: editContent.trim(),
          attachments: [],
          links: [],
          user_sid: user.sid,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEditingCommentId(null);
          setEditContent('');
          await refetchComments?.();
        }
      }
    } catch (err) {
      console.error('コメント編集エラー:', err);
    } finally {
      setSubmitting(false);
    }
  }, [material, user?.sid, editContent, refetchComments]);

  const handleDelete = useCallback(async (commentId: string) => {
    if (!material || !user?.sid) return;
    const confirmed = await confirmDialog({
      title: 'コメント削除',
      message: 'このコメントを削除しますか？',
      confirmText: '削除する',
      cancelText: 'キャンセル',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/materials/${material.id}/comments?comment_id=${commentId}&user_sid=${user.sid}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await refetchComments?.();
          if (material?.id) {
            onCommentAdded?.(material.id);
          }
        }
      }
    } catch (err) {
      console.error('コメント削除エラー:', err);
    }
  }, [material, user?.sid, onCommentAdded, refetchComments, confirmDialog]);

  return {
    submitting,
    editingCommentId,
    setEditingCommentId,
    editContent,
    setEditContent,
    handleSubmit,
    handleEdit,
    handleDelete,
  };
}

