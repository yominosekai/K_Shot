// コメントフォーム管理フック

import { useState, useRef, useCallback } from 'react';
import type { CommentAttachment, CommentLink } from '@/features/comments/types';

export function useCommentForm() {
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [parentCommentId, setParentCommentId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const [links, setLinks] = useState<CommentLink[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkMaterialId, setLinkMaterialId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setContent('');
    setIsPrivate(false);
    setParentCommentId(null);
    setAttachments([]);
    setLinks([]);
    setShowLinkInput(false);
    setLinkMaterialId('');
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: CommentAttachment[] = [];
    Array.from(files).forEach((file) => {
      newAttachments.push({
        filename: file.name,
        original_filename: file.name,
        size: file.size,
        type: file.type,
      });
    });
    setAttachments([...attachments, ...newAttachments]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleAddLink = async () => {
    if (!linkMaterialId.trim()) return;

    try {
      const response = await fetch(`/api/materials/${linkMaterialId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          setLinks((prev) => [...prev, { material_id: linkMaterialId, material_title: data.material.title }]);
          setLinkMaterialId('');
          setShowLinkInput(false);
        } else {
          alert('資料が見つかりません');
        }
      }
    } catch (err) {
      console.error('リンク追加エラー:', err);
      alert('リンクの追加に失敗しました');
    }
  };

  const startReply = (commentId: string) => {
    setParentCommentId(commentId);
    setContent('');
    setIsPrivate(false);
    if (linkInputRef.current) {
      linkInputRef.current.focus();
    }
  };

  return {
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
    reset,
    handleFileSelect,
    handleRemoveAttachment,
    handleRemoveLink,
    handleAddLink,
    startReply,
  };
}

