'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UsersContext';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useProfileForm } from './hooks/useProfileForm';
import ProfileHeader from './components/ProfileHeader';
import ProfileBasicInfoForm from './components/ProfileBasicInfoForm';
import ProfileSkillsSection from './components/ProfileSkillsSection';
import ProfileCertificationsSection from './components/ProfileCertificationsSection';
import ProfileMOSSection from './components/ProfileMOSSection';
import ProfileDetailInfo from './components/ProfileDetailInfo';
import SkillMappingModal from '@/components/SkillMappingModal';

export default function ProfilePage() {
  const { user, updateUser, isLoading: authLoading } = useAuth();
  const { getAvatarUrl, invalidateCache } = useUsers();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSkillMappingModalOpen, setIsSkillMappingModalOpen] = useState(false);

  const {
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
  } = useProfileForm(user, isEditing);

  const handleAvatarChange = (newAvatar: File | string) => {
    if (typeof newAvatar === 'string') {
      // 空文字列の場合は削除
      setAvatarUrl('');
      setAvatarFile(null);
    } else {
      // Fileオブジェクトの場合はプレビュー用のURLを作成
      const previewUrl = URL.createObjectURL(newAvatar);
      setAvatarUrl(previewUrl);
      setAvatarFile(newAvatar);
    }
  };

  const handleFormDataChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setAvatarFile(null);
    resetForm();
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const userId = user.id;
      if (!userId) {
        setError('ユーザーIDを特定できませんでした');
        return;
      }
      setLoading(true);
      setError(null);
      
      // FormDataを作成
      const formDataToSend = new FormData();
      formDataToSend.append('userId', userId);
      formDataToSend.append('display_name', formData.display_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('bio', formData.bio || '');
      formDataToSend.append('department', formData.department || '');
      formDataToSend.append('skills', JSON.stringify(formData.skills));
      formDataToSend.append('certifications', JSON.stringify(formData.certifications));
      formDataToSend.append('mos', JSON.stringify(formData.mos));
      
      // アバター画像の処理
      const avatarUpdated = avatarFile instanceof File || avatarUrl === '';
      if (avatarFile instanceof File) {
        formDataToSend.append('avatar', avatarFile);
      } else if (avatarUrl === '') {
        formDataToSend.append('avatar', '');
      }
      
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          // 保存APIのレスポンスから直接データを取得して反映（即座に反映）
          const updatedProfile = result.user;
          
          // 不足しているフィールドにデフォルト値を設定
          const enrichedProfile = {
            ...updatedProfile,
            skills: updatedProfile.skills || [],
            certifications: updatedProfile.certifications || [],
            bio: updatedProfile.bio || '',
            avatar: updatedProfile.avatar || ''
          };
          
          // アバターが更新された場合のみ、タイムスタンプを更新してURLを変更（ブラウザキャッシュを無効化）
          if (avatarUpdated) {
            invalidateCache(userId, true);
          }
          
          // 即座に状態を更新（再取得不要）
          // アバターはキャッシュバスター付きURLを使用
          if (enrichedProfile.avatar) {
            const avatarUrl = getAvatarUrl(userId);
            setAvatarUrl(avatarUrl || '');
          } else {
            setAvatarUrl('');
          }
          setAvatarFile(null); // アップロード済みなのでクリア
          setFormData({
          display_name: enrichedProfile.display_name || '',
          email: enrichedProfile.email || '',
          bio: enrichedProfile.bio || '',
          department: enrichedProfile.department || '',
          skills: enrichedProfile.skills || [],
          certifications: enrichedProfile.certifications || [],
          mos: enrichedProfile.mos || [],
        });
          
          // AuthContextも即座に更新
          updateUser(enrichedProfile);
          
          setIsEditing(false);
        }
      } else {
        throw new Error('プロフィールの更新に失敗しました');
      }
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        <div className="w-full">
          <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        <div className="w-full">
          <p className="text-gray-500 dark:text-gray-400">ユーザー情報を取得できませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              プロフィール
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              ユーザープロフィール情報
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* プロフィールヘッダー */}
        <ProfileHeader
          user={user}
          avatarUrl={avatarUrl}
          isEditing={isEditing}
          onEditClick={() => setIsEditing(true)}
          onCancelClick={handleCancel}
          onAvatarError={() => setAvatarUrl('')}
        />

        {isEditing ? (
          <div className="space-y-6">
            {/* アバターアップロード */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                プロフィール画像
              </h3>
              <AvatarUpload
                currentAvatar={avatarUrl}
                currentInitials={user.display_name?.charAt(0).toUpperCase() || 'U'}
                onAvatarChange={handleAvatarChange}
              />
            </div>

            {/* 基本情報 */}
            <ProfileBasicInfoForm
              formData={formData}
              onFormDataChange={handleFormDataChange}
            />

            {/* スキル */}
            <ProfileSkillsSection
              skills={formData.skills}
              newSkill={newSkill}
              onNewSkillChange={setNewSkill}
              onAddSkill={addSkill}
              onRemoveSkill={removeSkill}
              isEditing={true}
            />

            {/* 資格・認定 */}
            <ProfileCertificationsSection
              certifications={formData.certifications}
              newCertification={newCertification}
              onNewCertificationChange={setNewCertification}
              onAddCertification={addCertification}
              onRemoveCertification={removeCertification}
              isEditing={true}
            />

            {/* 職場内資格 */}
            <ProfileMOSSection
              mos={formData.mos}
              newMos={newMos}
              onNewMosChange={setNewMos}
              onAddMos={addMos}
              onRemoveMos={removeMos}
              isEditing={true}
            />

            <div className="flex items-center space-x-4">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 自己紹介と詳細情報 */}
            <ProfileDetailInfo user={user} bio={user.bio} />

            {/* スキルマップボタン */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <button
                onClick={() => setIsSkillMappingModalOpen(true)}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                スキルマップを表示・編集
              </button>
            </div>

            {/* スキル・資格セクション */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ProfileSkillsSection
                skills={user.skills || []}
                newSkill=""
                onNewSkillChange={() => {}}
                onAddSkill={() => {}}
                onRemoveSkill={() => {}}
                isEditing={false}
              />
              <ProfileCertificationsSection
                certifications={user.certifications || []}
                newCertification=""
                onNewCertificationChange={() => {}}
                onAddCertification={() => {}}
                onRemoveCertification={() => {}}
                isEditing={false}
              />
              <ProfileMOSSection
                mos={user.mos || []}
                newMos=""
                onNewMosChange={() => {}}
                onAddMos={() => {}}
                onRemoveMos={() => {}}
                isEditing={false}
              />
            </div>
          </div>
        )}

        {/* スキルマッピングモーダル */}
        {user?.id && (
          <SkillMappingModal
            isOpen={isSkillMappingModalOpen}
            onClose={() => setIsSkillMappingModalOpen(false)}
            userId={user.id}
            readOnly={false}
            allowUnlink={false}
          />
        )}
      </div>
    </div>
  );
}
