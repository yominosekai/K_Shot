'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { X, Search, Shield, Trash2, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UsersContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import type { User as UserType } from '@/features/auth/types';
import RoleChangeModal from './RoleChangeModal';
import DeviceTokenManagementModal from './DeviceTokenManagementModal';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AccountManagementHeaderProps {
  onClose: () => void;
}

interface AccountSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

interface AccountListProps {
  users: UserType[];
  loading: boolean;
  onChangeRole: (user: UserType) => void;
  onDeviceToken: (user: UserType) => void;
  onDelete: (userId: string) => void;
  deletingUserId: string | null;
  currentUserId?: string;
  getAvatarUrl: (identifier: string) => string | null;
}

const ROLE_LABELS: Record<UserType['role'], string> = {
  admin: '管理者',
  instructor: '教育者',
  user: '一般ユーザー',
};

const getIdentifier = (user: Pick<UserType, 'id'>) => user.id || '';

const getDisplayInitial = (user: UserType) =>
  user.display_name?.charAt(0).toUpperCase() ||
  user.username?.charAt(0).toUpperCase() ||
  user.id?.charAt(0).toUpperCase() ||
  'U';

function useAccountManagement(isOpen: boolean) {
  const { user: currentUser } = useAuth();
  const { getAvatarUrl } = useUsers();
  const confirmDialog = useConfirmDialog();
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isRoleChangeModalOpen, setIsRoleChangeModalOpen] = useState(false);
  const [isDeviceTokenModalOpen, setIsDeviceTokenModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUsers(data.users || []);
          }
        }
      } catch (err) {
        console.error('ユーザー一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    if (isOpen) {
    fetchUsers();
    }
  }, [fetchUsers, isOpen]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const fields = [user.display_name, user.username, user.email, user.id];
      return fields.some((field) => field?.toLowerCase().includes(term));
    });
  }, [searchTerm, users]);

  const openRoleChangeModal = useCallback((user: UserType) => {
    setSelectedUser(user);
    setIsRoleChangeModalOpen(true);
  }, []);

  const closeRoleChangeModal = useCallback(() => {
    setSelectedUser(null);
    setIsRoleChangeModalOpen(false);
  }, []);

  const openDeviceTokenModal = useCallback((user: UserType) => {
    setSelectedUser(user);
    setIsDeviceTokenModalOpen(true);
  }, []);

  const closeDeviceTokenModal = useCallback(() => {
    setSelectedUser(null);
    setIsDeviceTokenModalOpen(false);
  }, []);

  const handleRoleChangeSuccess = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showMessage = useCallback(
    (title: string, message: string, variant: 'default' | 'danger' | 'info' = 'default') =>
      confirmDialog({
        title,
        message,
        confirmText: 'OK',
        hideCancel: true,
        variant,
      }),
    [confirmDialog]
  );

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      const confirmed = await confirmDialog({
        title: 'アカウント削除',
        message: 'このアカウントを削除しますか？\nこの操作は取り消せません。',
        confirmText: '削除する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (!confirmed) return;

    try {
        setDeletingUserId(userId);
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success) {
          setUsers((prev) => prev.filter((user) => getIdentifier(user) !== userId));
          await showMessage('アカウント削除', 'アカウントを削除しました。', 'info');
        } else {
          await showMessage('エラー', data.error || 'アカウントの削除に失敗しました。', 'danger');
      }
    } catch (err) {
      console.error('アカウント削除エラー:', err);
        await showMessage('エラー', 'アカウントの削除に失敗しました。', 'danger');
    } finally {
      setDeletingUserId(null);
    }
    },
    [confirmDialog, showMessage]
  );

  return {
    searchTerm,
    setSearchTerm,
    filteredUsers,
    loading,
    selectedUser,
    isRoleChangeModalOpen,
    isDeviceTokenModalOpen,
    deletingUserId,
    openRoleChangeModal,
    closeRoleChangeModal,
    openDeviceTokenModal,
    closeDeviceTokenModal,
    handleRoleChangeSuccess,
    handleDeleteUser,
    currentUserId: currentUser ? getIdentifier(currentUser) : undefined,
    getAvatarUrl,
  };
}

export default function AccountManagementModal({ isOpen, onClose }: AccountManagementModalProps) {
  const {
    searchTerm,
    setSearchTerm,
    filteredUsers,
    loading,
    selectedUser,
    isRoleChangeModalOpen,
    isDeviceTokenModalOpen,
    deletingUserId,
    openRoleChangeModal,
    closeRoleChangeModal,
    openDeviceTokenModal,
    closeDeviceTokenModal,
    handleRoleChangeSuccess,
    handleDeleteUser,
    currentUserId,
    getAvatarUrl,
  } = useAccountManagement(isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <AccountManagementHeader onClose={onClose} />
          <AccountSearchBar value={searchTerm} onChange={setSearchTerm} />
          <AccountList
            users={filteredUsers}
            loading={loading}
            onChangeRole={openRoleChangeModal}
            onDeviceToken={openDeviceTokenModal}
            onDelete={handleDeleteUser}
            deletingUserId={deletingUserId}
            currentUserId={currentUserId}
            getAvatarUrl={getAvatarUrl}
          />
        </div>
      </div>

      {selectedUser && (
        <>
          <RoleChangeModal
            isOpen={isRoleChangeModalOpen}
            onClose={closeRoleChangeModal}
            currentUser={selectedUser}
            onSuccess={handleRoleChangeSuccess}
          />
          <DeviceTokenManagementModal
            isOpen={isDeviceTokenModalOpen}
            onClose={closeDeviceTokenModal}
            user={selectedUser}
            onSuccess={handleRoleChangeSuccess}
          />
        </>
      )}
    </>
  );
}

const AccountManagementHeader = ({ onClose }: AccountManagementHeaderProps) => (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">アカウント管理</h2>
    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" aria-label="閉じる">
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
);

const AccountSearchBar = ({ value, onChange }: AccountSearchBarProps) => (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="ユーザー名、表示名、メールアドレスで検索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
);

const AccountList = ({
  users,
  loading,
  onChangeRole,
  onDeviceToken,
  onDelete,
  deletingUserId,
  currentUserId,
  getAvatarUrl,
}: AccountListProps) => {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
                <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
              </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-gray-500 dark:text-gray-400">ユーザーが存在しません</p>
              </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
        {users.map((user) => {
          const identifier = getIdentifier(user);
          const avatarUrl = identifier ? getAvatarUrl(identifier) : null;
          const canDelete = identifier && identifier !== currentUserId;
          return (
                  <div
              key={identifier}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 flex-shrink-0">
                  {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={user.display_name || 'Avatar'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                    <span>{getDisplayInitial(user)}</span>
                  )}
                      </div>
                      <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.display_name || user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email} • {ROLE_LABELS[user.role] ?? ROLE_LABELS.user}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                  onClick={() => onChangeRole(user)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="権限変更"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDeviceToken(user)}
                        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                        title="デバイス管理"
                      >
                        <Smartphone className="w-5 h-5" />
                      </button>
                {canDelete && (
                        <button
                    onClick={() => onDelete(identifier)}
                    disabled={deletingUserId === identifier}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title="削除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
          );
        })}
        </div>
      </div>
  );
};

