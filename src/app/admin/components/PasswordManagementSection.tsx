// パスワード管理セクション（管理者専用）

'use client';

import { useState, useEffect } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import RolePasswordChangeModal from '@/components/RolePasswordChangeModal';

interface DefaultPasswordStatus {
  isDefaultAdmin: boolean;
  isDefaultInstructor: boolean;
}

export default function PasswordManagementSection() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<DefaultPasswordStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // デフォルトパスワード状態を取得
  useEffect(() => {
    const fetchDefaultStatus = async () => {
      try {
        const response = await fetch('/api/admin/system-config/role-password/check-default');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDefaultStatus({
              isDefaultAdmin: data.isDefaultAdmin,
              isDefaultInstructor: data.isDefaultInstructor,
            });
          }
        }
      } catch (err) {
        console.error('デフォルトパスワード状態の取得に失敗しました:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDefaultStatus();
  }, []);

  // モーダルが閉じられたら状態を再取得（パスワード変更後）
  const handleModalClose = () => {
    setIsPasswordModalOpen(false);
    // パスワード変更後に状態を再取得
    const fetchDefaultStatus = async () => {
      try {
        const response = await fetch('/api/admin/system-config/role-password/check-default');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDefaultStatus({
              isDefaultAdmin: data.isDefaultAdmin,
              isDefaultInstructor: data.isDefaultInstructor,
            });
          }
        }
      } catch (err) {
        console.error('デフォルトパスワード状態の取得に失敗しました:', err);
      }
    };
    fetchDefaultStatus();
  };

  const hasDefaultPassword = defaultStatus?.isDefaultAdmin || defaultStatus?.isDefaultInstructor;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Lock className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">パスワード管理</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            管理者・教育者の権限変更パスワードを変更できます。
          </p>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            パスワード管理を開く
          </button>

          {/* デフォルトパスワード警告 */}
          {!loading && hasDefaultPassword && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    セキュリティ警告：デフォルトパスワードが設定されています
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                    {defaultStatus?.isDefaultAdmin && (
                      <li>管理者の権限変更パスワードがデフォルトのままです</li>
                    )}
                    {defaultStatus?.isDefaultInstructor && (
                      <li>教育者の権限変更パスワードがデフォルトのままです</li>
                    )}
                  </ul>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    セキュリティのため、すぐにパスワードを変更することを強く推奨します。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <RolePasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={handleModalClose}
      />
    </>
  );
}

