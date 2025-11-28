'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { AvatarCropEditor } from './AvatarCropEditor';

interface AvatarUploadProps {
  currentAvatar?: string;
  currentInitials?: string;
  onAvatarChange: (avatar: File | string) => void;
  className?: string;
}

export function AvatarUpload({
  currentAvatar,
  currentInitials = 'U',
  onAvatarChange,
  className = '',
}: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('ファイルサイズは2MB以下にしてください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCropImageSrc(result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    console.log('[AvatarUpload] handleCropComplete開始:', {
      blobSize: croppedImageBlob.size,
      blobType: croppedImageBlob.type,
    });
    // Blobを直接使用（Base64変換は不要）
    const previewUrl = URL.createObjectURL(croppedImageBlob);
    setPreviewUrl(previewUrl);
    // BlobをFileオブジェクトに変換して親コンポーネントに渡す
    const file = new File([croppedImageBlob], 'avatar.png', { type: 'image/png' });
    onAvatarChange(file as any); // Fileオブジェクトを渡す
    setShowCropModal(false);
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    onAvatarChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 現在のアバター表示 */}
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-4xl font-bold text-white overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 shadow-lg">
          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt="Avatar"
              width={96}
              height={96}
              className="w-full h-full object-cover"
              unoptimized={false}
              onError={() => {
                setPreviewUrl(null);
                onAvatarChange('');
              }}
            />
          ) : (
            currentInitials || 'U'
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            アバターを変更
          </button>

          {displayAvatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              アバターを削除
            </button>
          )}
        </div>
      </div>

      {/* ドラッグ&ドロップエリア */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        <div className="text-4xl mb-2">📷</div>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          画像をドラッグ&ドロップするか、クリックして選択
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          JPG, PNG形式、最大2MB
        </p>
      </div>

      {/* ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* クロップエディタ */}
      {showCropModal && (
        <AvatarCropEditor
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </div>
  );
}

