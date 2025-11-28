'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { User } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface UserAvatarProps {
  sid?: string | null;
  user?: User | null;
  name?: string | null;
  size?: number;
  className?: string;
  showFallbackBackground?: boolean;
}

export function UserAvatar({
  sid,
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
    if (sid) {
      return users.get(sid) || null;
    }
    return null;
  }, [sid, user, users]);

  useEffect(() => {
    if (sid && !resolvedUser) {
      getUser(sid).catch((err) => {
        console.error('[UserAvatar] ユーザー取得エラー:', err);
      });
    }
  }, [sid, resolvedUser, getUser]);

  const displayName =
    resolvedUser?.display_name ||
    resolvedUser?.username ||
    name ||
    (sid ? sid.split('-').pop() : 'ユーザー');

  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';
  
  // キャッシュバスター付きアバターURLを取得
  const avatarUrl = useMemo(() => {
    if (!sid) return null;
    
    // UsersContextのgetAvatarUrlを使用（キャッシュとタイムスタンプ管理を一貫して行う）
    return getAvatarUrl(sid);
  }, [sid, getAvatarUrl]);

  // avatarUrlやresolvedUserが変更されたときにimageErrorをリセット
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl, resolvedUser]);

  const hasAvatar = Boolean(!imageError && sid && (resolvedUser?.avatar || user?.avatar));

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


