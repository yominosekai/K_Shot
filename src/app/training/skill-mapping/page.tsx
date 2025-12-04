// 教育訓練専用スキルマッピング管理ページ

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useFullscreen } from '@/contexts/FullscreenContext';
import { checkPermission } from '@/features/auth/utils';
import SkillMappingManagementView from './components/SkillMappingManagementView';

export default function TrainingSkillMappingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { isFullscreen } = useFullscreen();

  // 教育訓練ロール以上が必要
  useEffect(() => {
    if (user && !checkPermission(user, 'training')) {
      router.push('/');
    }
  }, [user, router]);

  if (!user || !checkPermission(user, 'training')) {
    return null;
  }

  return (
    <div className={`w-full ${isFullscreen ? 'p-2 sm:p-4' : 'p-4 sm:p-6 lg:p-8'}`}>
      <SkillMappingManagementView />
    </div>
  );
}

