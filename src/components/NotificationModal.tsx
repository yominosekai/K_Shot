// 通知一覧モーダルコンポーネント

'use client';

import type { MouseEvent } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Bell, Check, ExternalLink, Folder, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import MaterialModal from './MaterialModal';
import type { NotificationNormalized } from '@/features/notifications/types';
import type { MaterialNormalized } from '@/features/materials/types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
}

type NotificationActionMap = {
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAsUnread: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenMaterial: (materialId: string) => void;
  onNavigateFolder: (path: string) => void;
};

interface NotificationItemProps extends NotificationActionMap {
  notification: NotificationNormalized;
  markingAsRead: string | null;
  markingAsUnread: string | null;
  deletingNotification: string | null;
}

interface NotificationListProps extends NotificationActionMap {
  notifications: NotificationNormalized[];
  loading: boolean;
  markingAsRead: string | null;
  markingAsUnread: string | null;
  deletingNotification: string | null;
}

interface NotificationModalHeaderProps {
  unreadCount: number;
  totalCount: number;
  isDeletingAll: boolean;
  onMarkAllRead: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

const RELATIVE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

const MAX_NOTIFICATIONS = 50;

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;

  return date.toLocaleDateString('ja-JP', RELATIVE_DATE_FORMAT);
}

function useNotificationOperations(userId?: string, onNotificationRead?: () => void) {
  const [notifications, setNotifications] = useState<NotificationNormalized[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAsUnread, setMarkingAsUnread] = useState<string | null>(null);
  const [deletingNotification, setDeletingNotification] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const notifyReadChange = useCallback(() => {
    onNotificationRead?.();
  }, [onNotificationRead]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/notifications?limit=${MAX_NOTIFICATIONS}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (err) {
      console.error('通知取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateNotification = useCallback(
    (notificationId: string, updater: (item: NotificationNormalized) => NotificationNormalized) => {
      setNotifications((prev) => prev.map((notification) => (notification.id === notificationId ? updater(notification) : notification)));
    },
    []
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      setMarkingAsRead(notificationId);
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_sid: userId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            updateNotification(notificationId, (notification) => ({
              ...notification,
              is_read: true,
              read_date: new Date().toISOString(),
            }));
            notifyReadChange();
          }
        }
      } catch (err) {
        console.error('通知既読エラー:', err);
      } finally {
        setMarkingAsRead(null);
      }
    },
    [notifyReadChange, updateNotification, userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch('/api/notifications/all/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_sid: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications((prev) =>
            prev.map((notification) => ({
              ...notification,
              is_read: true,
              read_date: new Date().toISOString(),
            }))
          );
          notifyReadChange();
        }
      }
    } catch (err) {
      console.error('全通知既読エラー:', err);
    }
  }, [notifyReadChange, userId]);

  const markAsUnread = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      setMarkingAsUnread(notificationId);
      try {
        const response = await fetch(`/api/notifications/${notificationId}/unread`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_sid: userId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            updateNotification(notificationId, (notification) => ({
              ...notification,
              is_read: false,
              read_date: undefined,
            }));
            notifyReadChange();
          }
        }
      } catch (err) {
        console.error('通知未読戻しエラー:', err);
      } finally {
        setMarkingAsUnread(null);
      }
    },
    [notifyReadChange, updateNotification, userId]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      setDeletingNotification(notificationId);
      try {
        const response = await fetch(`/api/notifications/${notificationId}?user_sid=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
            notifyReadChange();
          }
        }
      } catch (err) {
        console.error('通知削除エラー:', err);
      } finally {
        setDeletingNotification(null);
      }
    },
    [notifyReadChange, userId]
  );

  const deleteAllNotifications = useCallback(async () => {
    if (!userId) return;
    setBulkDeleting(true);
    try {
      const response = await fetch('/api/notifications/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_sid: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications([]);
          notifyReadChange();
        }
      }
    } catch (err) {
      console.error('全通知削除エラー:', err);
    } finally {
      setBulkDeleting(false);
    }
  }, [notifyReadChange, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  return {
    notifications,
    loading,
    markingAsRead,
    markingAsUnread,
    deletingNotification,
    bulkDeleting,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    deleteNotification,
    deleteAllNotifications,
    unreadCount,
  };
}

const NotificationModalHeader = ({
  unreadCount,
  totalCount,
  isDeletingAll,
  onMarkAllRead,
  onDeleteAll,
  onClose,
}: NotificationModalHeaderProps) => (
  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-3">
      <Bell className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        通知
        {unreadCount > 0 && (
          <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
            ({unreadCount}件の未読)
          </span>
        )}
      </h2>
    </div>
    <div className="flex items-center space-x-2">
      {unreadCount > 0 && (
        <button
          onClick={onMarkAllRead}
          className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        >
          すべて既読にする
        </button>
      )}
      {totalCount > 0 && (
        <button
          onClick={onDeleteAll}
          disabled={isDeletingAll}
          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
          title="すべての通知を削除"
        >
          全部クリア
        </button>
      )}
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        aria-label="閉じる"
      >
        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  </div>
);

const NotificationList = ({
  notifications,
  loading,
  markingAsRead,
  markingAsUnread,
  deletingNotification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onOpenMaterial,
  onNavigateFolder,
}: NotificationListProps) => {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        通知はありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          markingAsRead={markingAsRead}
          markingAsUnread={markingAsUnread}
          deletingNotification={deletingNotification}
          onMarkAsRead={onMarkAsRead}
          onMarkAsUnread={onMarkAsUnread}
          onDelete={onDelete}
          onOpenMaterial={onOpenMaterial}
          onNavigateFolder={onNavigateFolder}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({
  notification,
  markingAsRead,
  markingAsUnread,
  deletingNotification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onOpenMaterial,
  onNavigateFolder,
}: NotificationItemProps) => {
  const cardStyle = notification.is_read
    ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

  const handleOpenMaterial = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (notification.material_id) {
        onOpenMaterial(notification.material_id);
      }
    },
    [notification.material_id, onOpenMaterial]
  );

  const handleNavigateFolder = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.stopPropagation();
      if (notification.material_folder_path) {
        onNavigateFolder(notification.material_folder_path);
      }
    },
    [notification.material_folder_path, onNavigateFolder]
  );

  return (
    <div className={`p-4 rounded-lg border transition-colors ${cardStyle}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{notification.title}</p>
            {!notification.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{notification.from_user_name || notification.from_user_sid}さんから</span>
            {notification.material_title && <span className="truncate">資料: {notification.material_title}</span>}
            <span>{formatRelativeDate(notification.created_date)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
          {notification.material_id && (
            <>
              {notification.material_folder_path && (
                <a
                  href={`/materials?path=${encodeURIComponent(notification.material_folder_path)}`}
                  onClick={handleNavigateFolder}
                  className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                  title="フォルダに移動"
                >
                  <Folder className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={handleOpenMaterial}
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="資料を開く"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}
          {notification.is_read ? (
            <button
              onClick={() => onMarkAsUnread(notification.id)}
              disabled={markingAsUnread === notification.id}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="未読に戻す"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              disabled={markingAsRead === notification.id}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="既読にする"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            disabled={deletingNotification === notification.id}
            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function NotificationModal({
  isOpen,
  onClose,
  onNotificationRead,
}: NotificationModalProps) {
  const { user } = useAuth();
  const confirmDialog = useConfirmDialog();
  const userId = user?.id;
  const {
    notifications,
    loading,
    markingAsRead,
    markingAsUnread,
    deletingNotification,
    bulkDeleting,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    deleteNotification,
    deleteAllNotifications,
    unreadCount,
  } = useNotificationOperations(userId, onNotificationRead);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [fetchNotifications, isOpen]);

  const confirmAndDelete = useCallback(
    async (notificationId: string) => {
      const confirmed = await confirmDialog({
        title: '通知の削除',
        message: 'この通知を削除しますか？',
        confirmText: '削除する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (confirmed) {
        await deleteNotification(notificationId);
      }
    },
    [confirmDialog, deleteNotification]
  );

  const confirmAndDeleteAll = useCallback(async () => {
    const confirmed = await confirmDialog({
      title: 'すべての通知を削除',
      message: 'すべての通知を削除しますか？この操作は取り消せません。',
      confirmText: '削除する',
      cancelText: 'キャンセル',
      variant: 'danger',
    });
    if (confirmed) {
      await deleteAllNotifications();
    }
  }, [confirmDialog, deleteAllNotifications]);

  const handleOpenMaterial = useCallback(async (materialId: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          setSelectedMaterial(data.material);
          setIsMaterialModalOpen(true);
        }
      }
    } catch (err) {
      console.error('資料取得エラー:', err);
    }
  }, []);

  const handleNavigateFolder = useCallback(
    (path: string) => {
      onClose();
      window.location.href = `/materials?path=${encodeURIComponent(path)}`;
    },
    [onClose]
  );

  const headerProps = useMemo<NotificationModalHeaderProps>(
    () => ({
      unreadCount,
      totalCount: notifications.length,
      isDeletingAll: bulkDeleting,
      onMarkAllRead: markAllAsRead,
      onDeleteAll: confirmAndDeleteAll,
      onClose,
    }),
    [bulkDeleting, confirmAndDeleteAll, markAllAsRead, notifications.length, onClose, unreadCount]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <NotificationModalHeader {...headerProps} />
        <div className="flex-1 overflow-y-auto p-6">
          <NotificationList
            notifications={notifications}
            loading={loading}
            markingAsRead={markingAsRead}
            markingAsUnread={markingAsUnread}
            deletingNotification={deletingNotification}
            onMarkAsRead={markAsRead}
            onMarkAsUnread={markAsUnread}
            onDelete={confirmAndDelete}
            onOpenMaterial={handleOpenMaterial}
            onNavigateFolder={handleNavigateFolder}
          />
        </div>
      </div>

      {/* 資料モーダル */}
      <MaterialModal
        material={selectedMaterial}
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setSelectedMaterial(null);
        }}
      />
    </div>
  );
}

