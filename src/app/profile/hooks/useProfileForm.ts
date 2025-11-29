// プロフィールフォーム管理フック

import { useState, useEffect } from 'react';
import type { User } from '@/features/auth/types';
import { useUsers } from '@/contexts/UsersContext';

interface ProfileFormData {
  display_name: string;
  email: string;
  bio: string;
  department: string;
  skills: string[];
  certifications: string[];
  mos: string[];
}

export function useProfileForm(user: User | null, isEditing: boolean) {
  const { getAvatarUrl } = useUsers();
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    email: '',
    bio: '',
    department: '',
    skills: [],
    certifications: [],
    mos: [],
  });
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newMos, setNewMos] = useState('');

  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email || '',
        bio: user.bio || '',
        department: user.department || '',
        skills: user.skills || [],
        certifications: user.certifications || [],
        mos: user.mos || [],
      });
      // アバターはキャッシュバスター付きURLを使用
      const avatarSourceId = user.id;
      if (user.avatar && avatarSourceId) {
        const avatarUrl = getAvatarUrl(avatarSourceId);
        setAvatarUrl(avatarUrl || '');
      } else {
        setAvatarUrl('');
      }
    }
  }, [user, isEditing]);

  const resetForm = () => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email || '',
        bio: user.bio || '',
        department: user.department || '',
        skills: user.skills || [],
        certifications: user.certifications || [],
        mos: user.mos || [],
      });
      // アバターはキャッシュバスター付きURLを使用
      const avatarSourceId = user.id;
      if (user.avatar && avatarSourceId) {
        const avatarUrl = getAvatarUrl(avatarSourceId);
        setAvatarUrl(avatarUrl || '');
      } else {
        setAvatarUrl('');
      }
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, newCertification.trim()],
      });
      setNewCertification('');
    }
  };

  const removeCertification = (certification: string) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((c) => c !== certification),
    });
  };

  const addMos = () => {
    if (newMos.trim() && !formData.mos.includes(newMos.trim())) {
      setFormData({
        ...formData,
        mos: [...formData.mos, newMos.trim()],
      });
      setNewMos('');
    }
  };

  const removeMos = (mos: string) => {
    setFormData({
      ...formData,
      mos: formData.mos.filter((m) => m !== mos),
    });
  };

  return {
    formData,
    setFormData,
    avatarUrl,
    setAvatarUrl,
    newSkill,
    setNewSkill,
    newCertification,
    setNewCertification,
    newMos,
    setNewMos,
    resetForm,
    addSkill,
    removeSkill,
    addCertification,
    removeCertification,
    addMos,
    removeMos,
  };
}

