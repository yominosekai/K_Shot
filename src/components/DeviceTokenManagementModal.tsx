// デバイストークン管理モーダルコンポーネント

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, Download, Trash2, RefreshCw, Upload } from 'lucide-react';
import type { User as UserType } from '@/features/auth/types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface DeviceTokenManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onSuccess?: () => void;
}

interface DeviceToken {
  token: string;
  device_label: string | null;
  issued_at: string;
  last_used: string | null;
  status: string;
}

export default function DeviceTokenManagementModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: DeviceTokenManagementModalProps) {
  const confirmDialog = useConfirmDialog();
  const [tokens, setTokens] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reissuing, setReissuing] = useState(false);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState('');

  const fetchTokens = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const encodedId = encodeURIComponent(user.id || '');
      const response = await fetch(`/api/users/${encodedId}/device-tokens`);
      const data = await response.json();

      if (data.success) {
        setTokens(data.tokens || []);
      } else {
        setError(data.error || 'デバイストークン一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('デバイストークン一覧取得エラー:', err);
      setError('デバイストークン一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchTokens();
      setDeviceLabel('');
    }
  }, [isOpen, user, fetchTokens]);

  const handleReissue = async () => {
    if (!user) return;

    const confirmed = await confirmDialog({
      title: 'デバイストークンの再発行',
      message: '既存のアクティブなトークンはすべて失効します。新しいトークンを発行しますか？',
      confirmText: '再発行する',
      cancelText: 'キャンセル',
      variant: 'default',
    });

    if (!confirmed) return;

    try {
      setReissuing(true);
      setError(null);
      const encodedId = encodeURIComponent(user.id || '');
      const response = await fetch(`/api/users/${encodedId}/device-tokens/reissue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_label: deviceLabel || undefined,
          revoke_existing: true,
        }),
      });

      const data = await response.json();

      if (data.success && data.device_token_file) {
        // 証明ファイルをダウンロード
        const jsonContent = JSON.stringify(data.device_token_file, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'device-token.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await confirmDialog({
          title: '再発行完了',
          message: '新しいデバイストークンを発行しました。証明ファイルをダウンロードしました。ユーザーにこのファイルを渡してください。',
          confirmText: 'OK',
          hideCancel: true,
          variant: 'info',
        });

        await fetchTokens();
        if (onSuccess) {
          onSuccess();
        }
        setDeviceLabel('');
      } else {
        setError(data.error || 'デバイストークンの再発行に失敗しました');
      }
    } catch (err) {
      console.error('デバイストークン再発行エラー:', err);
      setError('デバイストークンの再発行に失敗しました');
    } finally {
      setReissuing(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!user) return;

    const confirmed = await confirmDialog({
      title: 'デバイストークンの失効',
      message: 'このデバイストークンを失効させますか？この操作は取り消せません。',
      confirmText: '失効させる',
      cancelText: 'キャンセル',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      setRevokingToken(token);
      setError(null);
      const encodedId = encodeURIComponent(user.id || '');
      const encodedToken = encodeURIComponent(token);
      const response = await fetch(`/api/users/${encodedId}/device-tokens/${encodedToken}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchTokens();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.error || 'デバイストークンの失効に失敗しました');
      }
    } catch (err) {
      console.error('デバイストークン失効エラー:', err);
      setError('デバイストークンの失効に失敗しました');
    } finally {
      setRevokingToken(null);
    }
  };

  const handleDownload = async (token: string) => {
    if (!user) return;

    try {
      const encodedId = encodeURIComponent(user.id || '');
      const response = await fetch(`/api/users/${encodedId}/device-tokens/download?token=${encodeURIComponent(token)}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'device-token.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        setError(data.error || '証明ファイルのダウンロードに失敗しました');
      }
    } catch (err) {
      console.error('証明ファイルダウンロードエラー:', err);
      setError('証明ファイルのダウンロードに失敗しました');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              デバイストークン管理
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 再発行フォーム */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                新しいトークンを発行
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    デバイスラベル（任意）
                  </label>
                  <input
                    type="text"
                    value={deviceLabel}
                    onChange={(e) => setDeviceLabel(e.target.value)}
                    placeholder="例: PC-001, 新しいPC"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleReissue}
                  disabled={reissuing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${reissuing ? 'animate-spin' : ''}`} />
                  <span>{reissuing ? '再発行中...' : '新しいトークンを発行'}</span>
                </button>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  既存のアクティブなトークンはすべて失効し、新しいトークンが発行されます。証明ファイルが自動的にダウンロードされます。
                </p>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* トークン一覧 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                デバイストークン一覧
              </h3>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
                </div>
              ) : tokens.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-gray-500 dark:text-gray-400">デバイストークンがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          デバイスラベル
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          発行日時
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          最終使用
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          ステータス
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token) => (
                        <tr
                          key={token.token}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                            {token.device_label || '-'}
                          </td>
                          <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(token.issued_at)}
                          </td>
                          <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(token.last_used)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                token.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {token.status === 'active' ? 'アクティブ' : '失効'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              {token.status === 'active' && (
                                <>
                                  <button
                                    onClick={() => handleDownload(token.token)}
                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="証明ファイルをダウンロード"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRevoke(token.token)}
                                    disabled={revokingToken === token.token}
                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                    title="失効させる"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}



