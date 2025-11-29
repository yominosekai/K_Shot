'use client';

import { CheckCircle, XCircle, AlertCircle, Globe, Lock, Trash2, Reply, X } from 'lucide-react';

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

interface FeedbackItemProps {
  feedback: Feedback;
  showDetails: boolean;
  showResponseInput: boolean;
  responseInput: string;
  pendingStatus: 'open' | 'resolved' | 'closed' | undefined;
  submittingResponse: boolean;
  submittingStatus: boolean;
  onShowResponse: () => void;
  onCancelResponse: () => void;
  onResponseInputChange: (value: string) => void;
  onResponseSubmit: () => void;
  onStatusChange: (status: 'open' | 'resolved' | 'closed') => void;
  onConfirmStatus: () => void;
  onDelete: () => void;
  formatDate: (dateString: string) => string;
}

export default function FeedbackItem({
  feedback,
  showDetails,
  showResponseInput,
  responseInput,
  pendingStatus,
  submittingResponse,
  submittingStatus,
  onShowResponse,
  onCancelResponse,
  onResponseInputChange,
  onResponseSubmit,
  onStatusChange,
  onConfirmStatus,
  onDelete,
  formatDate,
}: FeedbackItemProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved':
        return '対応済み';
      case 'closed':
        return 'クローズ';
      default:
        return '対応中';
    }
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon(feedback.status)}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getStatusLabel(feedback.status)}
          </span>
          {feedback.is_public ? (
            <Globe className="w-4 h-4 text-gray-400" />
          ) : (
            <Lock className="w-4 h-4 text-gray-400" />
          )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
            {feedback.display_name || feedback.username || feedback.user_id}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(feedback.created_date)}
        </div>
      </div>

      {showDetails && feedback.content && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {feedback.content}
          </p>
        </div>
      )}

      {feedback.response && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              管理者からの返事
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {formatDate(feedback.response.created_date)}
            </span>
          </div>
          <p className="text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
            {feedback.response.content}
          </p>
        </div>
      )}

      <div className="mb-3">
        {!showResponseInput ? (
          <button
            onClick={onShowResponse}
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
          >
            <Reply className="w-4 h-4" />
            <span>返信</span>
          </button>
        ) : (
          <>
            <button
              onClick={onCancelResponse}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-1 mb-2"
            >
              <X className="w-4 h-4" />
              <span>閉じる</span>
            </button>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <textarea
                value={responseInput}
                onChange={(e) => onResponseInputChange(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 mb-2"
                placeholder="返事を入力してください..."
                maxLength={10000}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {responseInput.length} / 10000 文字
                </p>
                <button
                  onClick={onResponseSubmit}
                  disabled={submittingResponse || !responseInput.trim()}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingResponse ? '送信中...' : '返事を送信'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">ステータス:</span>
          <select
            value={pendingStatus || feedback.status}
            onChange={(e) => onStatusChange(e.target.value as 'open' | 'resolved' | 'closed')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="open">対応中</option>
            <option value="resolved">対応済み</option>
            <option value="closed">クローズ</option>
          </select>
          {pendingStatus && pendingStatus !== feedback.status && (
            <button
              onClick={onConfirmStatus}
              disabled={submittingStatus}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingStatus ? '更新中...' : '確定'}
            </button>
          )}
        </div>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center space-x-1"
        >
          <Trash2 className="w-4 h-4" />
          <span>削除</span>
        </button>
      </div>
    </div>
  );
}


