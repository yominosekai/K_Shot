'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { User } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface UserAvatarProps {
  userId?: string | null;
  user?: User | null;
  name?: string | null;
  size?: number;
  className?: string;
  showFallbackBackground?: boolean;
}

export function UserAvatar({
  userId,
  user,
  name,
  size = 32,
  className,
  showFallbackBackground = true,
}: UserAvatarProps) {
  const { users, getUser, getAvatarUrl } = useUsers();
  const [imageError, setImageError] = useState(false);

  const resolvedUser = useMemo(() => {
    if (user) return user;
    if (userId) {
      return users.get(userId) || null;
    }
    return null;
  }, [userId, user, users]);

  useEffect(() => {
    if (userId && !resolvedUser) {
      getUser(userId).catch((err) => {
        console.error('[UserAvatar] ユーザー取得エラー:', err);
      });
    }
  }, [userId, resolvedUser, getUser]);

  const displayName =
    resolvedUser?.display_name ||
    resolvedUser?.username ||
    name ||
    (userId ? userId.split('-').pop() : 'ユーザー');

  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
  
  // キャッシュバスター付きアバターURLを取得
  const avatarUrl = useMemo(() => {
    if (!userId) return null;
    
    // UsersContextのgetAvatarUrlを使用（キャッシュとタイムスタンプ管理を一貫して行う）
    return getAvatarUrl(userId);
  }, [userId, getAvatarUrl]);

  // avatarUrlやresolvedUserが変更されたときにimageErrorをリセット
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl, resolvedUser]);

  const hasAvatar = Boolean(!imageError && userId && (resolvedUser?.avatar || user?.avatar));

  const sizeStyle = { width: size, height: size };

  const baseClass =
    'rounded-full overflow-hidden flex items-center justify-center text-white font-bold relative';
  const backgroundClass = showFallbackBackground ? 'bg-gradient-to-br from-blue-400 to-purple-500' : '';
  const combinedClass = [baseClass, backgroundClass, className].filter(Boolean).join(' ');

  return (
    <div className={combinedClass} style={sizeStyle}>
      {hasAvatar && avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName || 'Avatar'}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="text-xs" style={{ fontSize: size * 0.45 }}>
          {initial}
        </span>
      )}
    </div>
  );
}


