// 利用者一覧ページ

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Grid, List, RefreshCw, MessageSquare } from 'lucide-react';
import UserCard from '@/components/UserCard';
import UserListItem from '@/components/UserListItem';
import UserDetailModal from '@/components/UserDetailModal';
import UsersFilterPanel from '@/components/UsersFilterPanel';
import RoleFilterButtons from '@/components/members/components/RoleFilterButtons';
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu';
import NotificationSendModal from '@/components/NotificationSendModal';
import Toast from '@/components/Toast';
import { useUserFiltering } from '@/shared/hooks/useUserFiltering';
import type { User } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

type ViewMode = 'grid' | 'list';

export default function MembersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[]; user?: User } | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationTargetUser, setNotificationTargetUser] = useState<User | null>(null);

  // UsersContext（アバターURL用のキャッシュ）と同期するために使用
  const { setUser } = useUsers();

  // フィルタリングロジック
  const {
    searchTerm,
    setSearchTerm,
    selectedRole,
    setSelectedRole,
    selectedStatus,
    setSelectedStatus,
    selectedDepartment,
    setSelectedDepartment,
    selectedSkills,
    setSelectedSkills,
    selectedCertifications,
    setSelectedCertifications,
    selectedMosList,
    setSelectedMosList,
    filteredUsers,
  } = useUserFiltering({ users });

  // ユーザー一覧を取得
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('ユーザー一覧の取得に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        const fetchedUsers: User[] = data.users || [];
        setUsers(fetchedUsers);

        // UsersContextのキャッシュにも反映しておくことで、
        // getAvatarUrlが初回アクセス時から利用者一覧でも機能するようにする
        fetchedUsers.forEach((user: User) => {
          if (user.id) {
            setUser(user.id, user);
          }
        });
      } else {
        throw new Error(data.error || 'ユーザー一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('ユーザー取得エラー:', err);
      setError(err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ローカルストレージから表示モードを読み込む
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('members_viewMode') as ViewMode | null;
      if (savedViewMode) {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  // 表示モードをローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('members_viewMode', viewMode);
    }
  }, [viewMode]);


  const handleUserClick = useCallback((user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
  }, []);

  // リフレッシュ処理
  const handleRefresh = useCallback(async () => {
    try {
      await fetchUsers();
      setToastMessage('情報を更新しました');
      setIsToastVisible(true);
    } catch (err) {
      console.error('更新エラー:', err);
      setToastMessage('更新に失敗しました');
      setIsToastVisible(true);
    }
  }, [fetchUsers]);

  // ユーザーアイテムの右クリックメニューの処理
  const handleUserContextMenu = useCallback((e: React.MouseEvent, user: User) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: 'メッセージを送る',
        icon: <MessageSquare className="w-4 h-4" />,
        onClick: () => {
          setNotificationTargetUser(user);
          setIsNotificationModalOpen(true);
          setContextMenu(null);
        },
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      user,
    });
  }, []);

  // 背景の右クリックメニューの処理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // ユーザーカード/リストアイテムの上でない場合のみ処理
    const target = e.target as HTMLElement;
    if (target.closest('[data-user-item]')) {
      return; // ユーザーアイテムの上なので無視
    }

    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: '最新の情報に更新',
        icon: <RefreshCw className="w-4 h-4" />,
        onClick: handleRefresh,
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
  }, [handleRefresh]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full" onContextMenu={handleContextMenu}>
      <div className="w-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">利用者一覧</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {filteredUsers.length}名の利用者
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* 表示モード切り替え */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                aria-label="グリッド表示"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
                aria-label="リスト表示"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="名前、ユーザー名、メールアドレスで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* フィルター */}
        <RoleFilterButtons
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          onToggleFilters={() => setShowFilters(!showFilters)}
          showFilters={showFilters}
        />

        {/* フィルター詳細（ステータス・部署・スキル・資格・職場内資格） */}
        <UsersFilterPanel
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          selectedSkills={selectedSkills}
          onSkillsChange={setSelectedSkills}
          selectedCertifications={selectedCertifications}
          onCertificationsChange={setSelectedCertifications}
          selectedMosList={selectedMosList}
          onMosListChange={setSelectedMosList}
          users={users}
        />

        {/* コンテンツ */}
        <div className="min-h-[calc(100vh-300px)]" onContextMenu={handleContextMenu}>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                再試行
              </button>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-3'
              }
            >
              {filteredUsers.map((user) =>
                viewMode === 'grid' ? (
                  <div key={user.id} data-user-item>
                    <UserCard 
                      user={user} 
                      onClick={() => handleUserClick(user)}
                      onContextMenu={(e) => handleUserContextMenu(e, user)}
                    />
                  </div>
                ) : (
                  <div key={user.id} data-user-item>
                    <UserListItem 
                      user={user} 
                      onClick={() => handleUserClick(user)}
                      onContextMenu={(e) => handleUserContextMenu(e, user)}
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || selectedRole !== 'all' || selectedStatus !== 'all' || selectedDepartment !== 'all' || selectedSkills.length > 0 || selectedCertifications.length > 0 || selectedMosList.length > 0
                  ? '条件に一致する利用者が見つかりませんでした'
                  : '利用者がいません'}
              </p>
            </div>
          )}
        </div>

        {/* ユーザー詳細モーダル */}
        <UserDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          user={selectedUser}
        />

        {/* メッセージ送信モーダル */}
        <NotificationSendModal
          isOpen={isNotificationModalOpen}
          onClose={() => {
            setIsNotificationModalOpen(false);
            setNotificationTargetUser(null);
          }}
          targetUserId={notificationTargetUser?.id || null}
          onSuccess={() => {
            setToastMessage('メッセージを送信しました');
            setIsToastVisible(true);
          }}
        />

        {/* コンテキストメニュー */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* トースト通知 */}
        <Toast
          message={toastMessage}
          isVisible={isToastVisible}
          onClose={() => setIsToastVisible(false)}
        />
      </div>
    </div>
  );
}
