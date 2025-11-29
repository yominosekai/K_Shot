// いいね機能のカスタムフック

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { MaterialNormalized } from '@/features/materials/types';

interface UseMaterialLikesProps {
  materialId: string;
  initialLikes: number;
  material: MaterialNormalized; // materialオブジェクトからis_likedを取得
  onLikesUpdate?: (likes: number) => void;
}

export function useMaterialLikes({
  materialId,
  initialLikes,
  material,
  onLikesUpdate,
}: UseMaterialLikesProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // いいね状態を初期化（materialオブジェクトから取得）
  // 一括取得APIで取得されたis_likedを使用
  useEffect(() => {
    // materialオブジェクトにis_likedが含まれている場合はそれを使用
    // 含まれていない場合は個別APIで取得（後方互換性のため）
    if (material?.is_liked !== undefined) {
      setIsLiked(material.is_liked);
      return;
    }

    // 一括取得で取得されていない場合のみ個別APIで取得
    if (!user?.id || !materialId) {
      return;
    }

    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(`/api/materials/${materialId}/like?user_id=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsLiked(data.is_liked || false);
          }
        }
      } catch (err) {
        console.error('いいね状態取得エラー:', err);
      }
    };

    fetchLikeStatus();
  }, [materialId, user?.id, material?.is_liked]);

  // いいね数を更新（materialオブジェクトが更新された時）
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes, materialId]);

  // いいねを追加/削除
  const toggleLike = useCallback(async () => {
    if (!user?.id || isLoading) {
      return;
    }

    setIsLoading(true);
    const previousLikes = likes;
    const previousIsLiked = isLiked;

    // 楽観的更新
    if (isLiked) {
      setIsLiked(false);
      setLikes(Math.max(0, likes - 1));
    } else {
      setIsLiked(true);
      setLikes(likes + 1);
    }

    try {
      const response = await fetch(`/api/materials/${materialId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsLiked(data.is_liked || false);
          setLikes(data.likes || 0);
          onLikesUpdate?.(data.likes || 0);
        } else {
          // エラー時は元に戻す
          console.error('いいねAPIエラー:', data.error || '不明なエラー');
          setIsLiked(previousIsLiked);
          setLikes(previousLikes);
        }
      } else {
        // エラー時は元に戻す
        const errorData = await response.json().catch(() => ({}));
        console.error('いいねAPI HTTPエラー:', response.status, errorData);
        setIsLiked(previousIsLiked);
        setLikes(previousLikes);
      }
    } catch (err) {
      console.error('いいね更新エラー:', err);
      // エラー時は元に戻す
      setIsLiked(previousIsLiked);
      setLikes(previousLikes);
    } finally {
      setIsLoading(false);
    }
  }, [materialId, user?.id, isLiked, likes, isLoading, onLikesUpdate]);

  return {
    likes,
    isLiked,
    isLoading,
    toggleLike,
  };
}

