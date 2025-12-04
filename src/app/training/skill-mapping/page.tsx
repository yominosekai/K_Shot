// 教育訓練専用スキルマッピング管理ページ

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { checkPermission } from '@/features/auth/utils';
import SkillMappingManagementView from './components/SkillMappingManagementView';

export default function TrainingSkillMappingPage() {
  const { user } = useAuth();
  const router = useRouter();

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
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <SkillMappingManagementView />
    </div>
  );
}

