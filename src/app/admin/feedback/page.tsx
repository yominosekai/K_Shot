'use client';

import { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import { useFeedbackManagement } from './hooks/useFeedbackManagement';
import FeedbackFilter from './components/FeedbackFilter';
import FeedbackItem from './components/FeedbackItem';

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

export default function AdminFeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
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
  } = useFeedbackManagement();

  // 管理者権限チェック
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchFeedbacks();
    }
  }, [user, fetchFeedbacks]);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full">
        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2" />
            ご意見・ご要望管理
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            ユーザーからのご意見・ご要望を確認・管理します
          </p>
        </div>

        <FeedbackFilter
          statusFilter={statusFilter}
          isPublicFilter={isPublicFilter}
          showDetails={showDetails}
          onStatusFilterChange={setStatusFilter}
          onIsPublicFilterChange={setIsPublicFilter}
          onShowDetailsChange={setShowDetails}
        />

        {/* ご意見・ご要望一覧 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              読み込み中...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              ご意見・ご要望がありません
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <FeedbackItem
                  key={feedback.id}
                  feedback={feedback}
                  showDetails={showDetails}
                  showResponseInput={!!showResponseInputs[feedback.id]}
                  responseInput={responseInputs[feedback.id] || ''}
                  pendingStatus={pendingStatuses[feedback.id]}
                  submittingResponse={!!submittingResponse[feedback.id]}
                  submittingStatus={!!submittingStatus[feedback.id]}
                  onShowResponse={() => handleShowResponse(feedback.id)}
                  onCancelResponse={() => handleCancelResponse(feedback.id)}
                  onResponseInputChange={(value) =>
                    setResponseInputs((prev) => ({ ...prev, [feedback.id]: value }))
                  }
                  onResponseSubmit={() => handleResponseSubmit(feedback.id)}
                  onStatusChange={(status) => handleStatusChange(feedback.id, status)}
                  onConfirmStatus={() => handleConfirmStatus(feedback.id)}
                  onDelete={() => handleDelete(feedback.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </div>
  );
}
