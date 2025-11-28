// ユーザーフィルタリングカスタムフック

import { useState, useEffect, useMemo } from 'react';
import type { User } from '@/features/auth/types';

interface UseUserFilteringOptions {
  users: User[];
}

export function useUserFiltering({ users }: UseUserFilteringOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [selectedMosList, setSelectedMosList] = useState<string[]>([]);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.display_name?.toLowerCase().includes(term) ||
          user.username?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.department_id?.toLowerCase().includes(term)
      );
    }

    // ロールフィルター
    if (selectedRole !== 'all') {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    // ステータスフィルター
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((user) =>
        selectedStatus === 'active' ? user.is_active : !user.is_active
      );
    }

    // 部署フィルター
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((user) =>
        user.department === selectedDepartment || user.department_id === selectedDepartment
      );
    }

    // スキルフィルター（OR検索：選択したスキルのいずれかを持っているユーザー）
    if (selectedSkills.length > 0) {
      filtered = filtered.filter((user) =>
        user.skills && selectedSkills.some((skill) => user.skills!.includes(skill))
      );
    }

    // 資格フィルター（OR検索：選択した資格のいずれかを持っているユーザー）
    if (selectedCertifications.length > 0) {
      filtered = filtered.filter((user) =>
        user.certifications && selectedCertifications.some((cert) => user.certifications!.includes(cert))
      );
    }

    // 職場内資格フィルター（OR検索：選択した職場内資格のいずれかを持っているユーザー）
    if (selectedMosList.length > 0) {
      filtered = filtered.filter((user) =>
        user.mos && selectedMosList.some((mos) => user.mos!.includes(mos))
      );
    }

    return filtered;
  }, [users, searchTerm, selectedRole, selectedStatus, selectedDepartment, selectedSkills, selectedCertifications, selectedMosList]);

  return {
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
  };
}

