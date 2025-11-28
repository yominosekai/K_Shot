'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Lock, Globe, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/Toast';

interface Feedback {
  id: string;
  content: string;
  is_public: boolean;
  created_date: string;
  updated_date: string;
  status: 'open' | 'resolved' | 'closed';
  user_sid?: string;
  username?: string;
  display_name?: string;
  response?: {
    content: string;
    created_date: string;
    created_by: string;
  };
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  // ご意見・ご要望一覧を取得
  const fetchFeedbacks = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/feedback?page=${page}&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setFeedbacks(data.feedbacks || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('ご意見・ご要望取得エラー:', err);
      setToastMessage('ご意見・ご要望の取得に失敗しました');
      setIsToastVisible(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks(currentPage);
  }, [fetchFeedbacks, currentPage]);

  // ご意見・ご要望を投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setToastMessage('投稿内容を入力してください');
      setIsToastVisible(true);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          is_public: isPublic,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setContent('');
        setIsPublic(true);
        setToastMessage('ご意見・ご要望を投稿しました');
        setIsToastVisible(true);
        await fetchFeedbacks(currentPage);
      } else {
        setToastMessage(data.error || 'ご意見・ご要望の投稿に失敗しました');
        setIsToastVisible(true);
      }
    } catch (err) {
      console.error('ご意見・ご要望投稿エラー:', err);
      setToastMessage('ご意見・ご要望の投稿に失敗しました');
      setIsToastVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2" />
            ご意見・ご要望
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            システムへのご意見・ご要望をお聞かせください。管理者のみが確認できます。
          </p>
        </div>

        {/* 投稿フォーム */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                投稿内容
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="ご意見・ご要望をご記入ください..."
                maxLength={10000}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {content.length} / 10000 文字
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-2">
                {/* 公開ボタン */}
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center space-x-1 transition-all ${
                    isPublic
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500 opacity-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">公開</span>
                </button>

                {/* 矢印 */}
                <span className="text-gray-400 dark:text-gray-500 text-sm">⇔</span>

                {/* 非公開ボタン */}
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center space-x-1 transition-all ${
                    !isPublic
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-500 opacity-50'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">非公開</span>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                非公開は管理者のみが閲覧できます。
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  投稿中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  投稿する
                </>
              )}
            </button>
          </form>
        </div>

        {/* 投稿履歴 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            投稿履歴
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              読み込み中...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              まだご意見・ご要望がありません
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
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
                      {/* 投稿者名を表示（自分の投稿でない場合） */}
                      {feedback.user_sid && feedback.user_sid !== user?.sid && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {feedback.display_name || feedback.username || '不明なユーザー'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(feedback.created_date)}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {feedback.content}
                  </p>
                    
                    {/* 管理者からの返事表示 */}
                    {feedback.response && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
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
                  </div>
                ))}
              </div>

              {/* ページネーション */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {pagination.total}件中{' '}
                    {(pagination.page - 1) * pagination.limit + 1}〜
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{' '}
                    件を表示
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      前へ
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      次へ
                    </button>
                  </div>
                </div>
              )}
            </>
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

