'use client';

import { useState, useCallback } from 'react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface Feedback {
  id: string;
  user_id: string;
  content?: string;
  created_date: string;
  updated_date: string;
  is_public: boolean;
  status: 'open' | 'resolved' | 'closed';
  username?: string;
  display_name?: string;
  response?: {
    content: string;
    created_date: string;
    created_by: string;
  };
}

export function useFeedbackManagement() {
  const confirmDialog = useConfirmDialog();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPublicFilter, setIsPublicFilter] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [submittingResponse, setSubmittingResponse] = useState<Record<string, boolean>>({});
  const [showResponseInputs, setShowResponseInputs] = useState<Record<string, boolean>>({});
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, 'open' | 'resolved' | 'closed'>>({});
  const [submittingStatus, setSubmittingStatus] = useState<Record<string, boolean>>({});

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (isPublicFilter !== 'all') {
        params.append('is_public', isPublicFilter);
      }
      if (showDetails) {
        params.append('details', 'true');
      }

      const response = await fetch(`/api/admin/feedback?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setFeedbacks(data.feedbacks || []);
      } else {
        setToastMessage(data.error || 'ご意見・ご要望の取得に失敗しました');
        setIsToastVisible(true);
      }
    } catch (err) {
      console.error('ご意見・ご要望取得エラー:', err);
      setToastMessage('ご意見・ご要望の取得に失敗しました');
      setIsToastVisible(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isPublicFilter, showDetails]);

  const handleStatusChange = useCallback((feedbackId: string, newStatus: 'open' | 'resolved' | 'closed') => {
    setPendingStatuses((prev) => ({ ...prev, [feedbackId]: newStatus }));
  }, []);

  const handleConfirmStatus = useCallback(
    async (feedbackId: string) => {
      const pendingStatus = pendingStatuses[feedbackId];
      if (!pendingStatus) {
        return;
      }

      try {
        setSubmittingStatus((prev) => ({ ...prev, [feedbackId]: true }));
        const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: pendingStatus }),
        });

        const data = await response.json();

        if (data.success) {
          setToastMessage('ステータスを更新しました');
          setIsToastVisible(true);
          setPendingStatuses((prev) => {
            const newStatuses = { ...prev };
            delete newStatuses[feedbackId];
            return newStatuses;
          });
          await fetchFeedbacks();
        } else {
          setToastMessage(data.error || 'ステータスの更新に失敗しました');
          setIsToastVisible(true);
        }
      } catch (err) {
        console.error('ステータス更新エラー:', err);
        setToastMessage('ステータスの更新に失敗しました');
        setIsToastVisible(true);
      } finally {
        setSubmittingStatus((prev) => ({ ...prev, [feedbackId]: false }));
      }
    },
    [pendingStatuses, fetchFeedbacks]
  );

  const handleShowResponse = useCallback((feedbackId: string) => {
    setShowResponseInputs((prev) => ({ ...prev, [feedbackId]: true }));
  }, []);

  const handleCancelResponse = useCallback((feedbackId: string) => {
    setShowResponseInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[feedbackId];
      return newInputs;
    });
    setResponseInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[feedbackId];
      return newInputs;
    });
  }, []);

  const handleResponseSubmit = useCallback(
    async (feedbackId: string) => {
      const responseContent = responseInputs[feedbackId]?.trim();
      if (!responseContent) {
        setToastMessage('返事内容を入力してください');
        setIsToastVisible(true);
        return;
      }

      try {
        setSubmittingResponse((prev) => ({ ...prev, [feedbackId]: true }));
        const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: responseContent }),
        });

        const data = await response.json();

        if (data.success) {
          setToastMessage('返事を送信しました');
          setIsToastVisible(true);
          setResponseInputs((prev) => {
            const newInputs = { ...prev };
            delete newInputs[feedbackId];
            return newInputs;
          });
          setShowResponseInputs((prev) => {
            const newInputs = { ...prev };
            delete newInputs[feedbackId];
            return newInputs;
          });
          await fetchFeedbacks();
        } else {
          setToastMessage(data.error || '返事の送信に失敗しました');
          setIsToastVisible(true);
        }
      } catch (err) {
        console.error('返事送信エラー:', err);
        setToastMessage('返事の送信に失敗しました');
        setIsToastVisible(true);
      } finally {
        setSubmittingResponse((prev) => ({ ...prev, [feedbackId]: false }));
      }
    },
    [responseInputs, fetchFeedbacks]
  );

  const handleDelete = useCallback(
    async (feedbackId: string) => {
      const confirmed = await confirmDialog({
        title: 'ご意見・ご要望の削除',
        message: 'このご意見・ご要望を削除してもよろしいですか？',
        confirmText: '削除する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setToastMessage('ご意見・ご要望を削除しました');
          setIsToastVisible(true);
          await fetchFeedbacks();
        } else {
          setToastMessage(data.error || 'ご意見・ご要望の削除に失敗しました');
          setIsToastVisible(true);
        }
      } catch (err) {
        console.error('ご意見・ご要望削除エラー:', err);
        setToastMessage('ご意見・ご要望の削除に失敗しました');
        setIsToastVisible(true);
      }
    },
    [fetchFeedbacks, confirmDialog]
  );

  return {
    feedbacks,
    loading,
    statusFilter,
    isPublicFilter,
    showDetails,
    toastMessage,
    isToastVisible,
    responseInputs,
    setResponseInputs,
    submittingResponse,
    showResponseInputs,
    pendingStatuses,
    submittingStatus,
    setStatusFilter,
    setIsPublicFilter,
    setShowDetails,
    setIsToastVisible,
    fetchFeedbacks,
    handleStatusChange,
    handleConfirmStatus,
    handleShowResponse,
    handleCancelResponse,
    handleResponseSubmit,
    handleDelete,
  };
}


