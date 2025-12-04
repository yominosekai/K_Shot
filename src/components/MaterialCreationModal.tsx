// 資料作成モーダルコンポーネント

'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMaterialForm } from '@/shared/hooks/useMaterialForm';
import { useMaterialMetadata } from './MaterialCreationModal/hooks/useMaterialMetadata';
import UploadProgressBar from './UploadProgressBar';
import FileUploadArea from './FileUploadArea';
import MaterialBasicInfoForm from './MaterialCreationModal/components/MaterialBasicInfoForm';
import MaterialFolderSelector from './MaterialCreationModal/components/MaterialFolderSelector';
import MaterialContentEditor from './MaterialCreationModal/components/MaterialContentEditor';
import type { CategoryNormalized, MaterialNormalized } from '@/features/materials/types';

interface MaterialCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryNormalized[];
  initialFolderPath?: string;
  editMaterial?: MaterialNormalized | null; // 編集モードの場合の既存資料
}

export default function MaterialCreationModal({
  isOpen,
  onClose,
  onSuccess,
  categories: categoriesProp,
  initialFolderPath = '',
  editMaterial = null,
}: MaterialCreationModalProps) {
  const { user } = useAuth();
  const isEditMode = !!editMaterial;
  const [isRevisionPromptOpen, setIsRevisionPromptOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionReasonDraft, setRevisionReasonDraft] = useState('');
  const revisionConfirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const revisionReasonRef = useRef('');
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);

  const updateRevisionReason = (value: string) => {
    setRevisionReason(value);
    revisionReasonRef.current = value;
  };
  
  // メタデータ管理フック
  const {
    types,
    difficulties,
    categories,
    loadingTypes,
    loadingDifficulties,
    showTypeAddForm,
    setShowTypeAddForm,
    showCategoryAddForm,
    setShowCategoryAddForm,
    newTypeName,
    setNewTypeName,
    newCategoryName,
    setNewCategoryName,
    addingType,
    addingCategory,
    newTypeNameInputRef,
    newCategoryNameInputRef,
    handleAddType,
    handleAddCategory,
  } = useMaterialMetadata(isOpen);

  const {
    formData,
    setFormData,
    uploadedFiles,
    setUploadedFiles,
    isUploading,
    uploadMessage,
    uploadProgress,
    folders,
    handleInputChange,
    handleSubmit,
    resetForm,
    isEditMode: formIsEditMode,
  } = useMaterialForm({
    user,
    categories,
    initialFolderPath,
    editMaterial,
    isOpen,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (message) => {
      // DB_BUSYエラー（SQLITE_BUSYまたはSQLITE_CANTOPEN_ISDIR）の場合は特別なメッセージを表示
      if (message instanceof Error && (message as any).isDatabaseBusy) {
        setErrorModalMessage(message.message || String(message));
      } else if (typeof message === 'string' && message.includes('DB_BUSY')) {
        setErrorModalMessage(message);
      } else if (message instanceof Error) {
        setErrorModalMessage(message.message || String(message));
      } else {
        setErrorModalMessage(message);
      }
    },
    getRevisionReason: () => revisionReasonRef.current,
  });

  const handleFormDataUpdate = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // タイプ追加後にフォームデータを更新
  const handleAddTypeWithUpdate = async () => {
    const result = await handleAddType();
    if (result?.success && result?.type) {
      setFormData((prev) => ({ ...prev, type: result.type.name }));
    }
  };

  // カテゴリ追加後にフォームデータを更新
  const handleAddCategoryWithUpdate = async () => {
    const result = await handleAddCategory();
    if (result?.success && result?.category) {
      setFormData((prev) => ({ ...prev, category_id: result.category.id }));
    }
  };

  // モーダルが開かれたときにフォームをリセット（編集モードの場合は既存データを保持）
  useEffect(() => {
    if (!isOpen) {
      setErrorModalMessage(null);
    } else if (isOpen && !isEditMode) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode]); // resetFormは依存配列から除外（useCallbackでメモ化されているため）

  useEffect(() => {
    if (!isOpen) {
      updateRevisionReason('');
      setRevisionReasonDraft('');
      setIsRevisionPromptOpen(false);
      revisionConfirmedRef.current = false;
    }
  }, [isOpen]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isEditMode && !revisionConfirmedRef.current) {
      e.preventDefault();
      setRevisionReasonDraft(revisionReasonRef.current);
      setIsRevisionPromptOpen(true);
      return;
    }
    revisionConfirmedRef.current = false;
    handleSubmit(e);
  };

  const handleRevisionConfirm = () => {
    const trimmed = revisionReasonDraft.trim();
    updateRevisionReason(trimmed);
    revisionConfirmedRef.current = true;
    setIsRevisionPromptOpen(false);
    formRef.current?.requestSubmit();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEditMode ? '資料編集' : '新規資料作成'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
            disabled={isUploading}
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* フォーム */}
        <form
          ref={formRef}
          onSubmit={handleFormSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* 基本情報 */}
              <MaterialBasicInfoForm
                formData={formData}
                onFormDataChange={handleInputChange}
                onFormDataUpdate={handleFormDataUpdate}
                types={types}
                difficulties={difficulties}
                categories={categories}
                loadingTypes={loadingTypes}
                loadingDifficulties={loadingDifficulties}
                isUploading={isUploading}
                showTypeAddForm={showTypeAddForm}
                setShowTypeAddForm={setShowTypeAddForm}
                showCategoryAddForm={showCategoryAddForm}
                setShowCategoryAddForm={setShowCategoryAddForm}
                newTypeName={newTypeName}
                setNewTypeName={setNewTypeName}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                addingType={addingType}
                addingCategory={addingCategory}
                newTypeNameInputRef={newTypeNameInputRef}
                newCategoryNameInputRef={newCategoryNameInputRef}
                onAddType={handleAddTypeWithUpdate}
                onAddCategory={handleAddCategoryWithUpdate}
                isOpen={isOpen}
                isEditMode={isEditMode}
              />

              {/* 保存先 */}
              <MaterialFolderSelector
                folderPath={formData.folder_path}
                folders={folders}
                onFolderPathChange={handleInputChange}
                isUploading={isUploading}
              />

              {/* ファイルアップロード */}
              <FileUploadArea uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} />

              {/* 本文（Markdown対応） */}
              <MaterialContentEditor
                content={formData.content}
                onContentChange={handleInputChange}
                isUploading={isUploading}
              />
            </div>
          </div>

          {/* アップロードプログレスバー */}
          <UploadProgressBar
            isVisible={isUploading}
            progress={uploadProgress}
            message={uploadMessage}
          />

          {/* フッター */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading
                ? isEditMode
                  ? '更新中...'
                  : 'アップロード中...'
                : isEditMode
                ? '更新'
                : '作成'}
            </button>
          </div>
        </form>
      </div>

      {isRevisionPromptOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">更新理由（任意）</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                変更背景を残しておくと、後から参照しやすくなります。空欄でも問題ありません。
              </p>
            </div>
            <textarea
              rows={4}
              value={revisionReasonDraft}
              onChange={(e) => setRevisionReasonDraft(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 図表を最新版に差し替え、誤字修正 など"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{revisionReasonDraft.length}/500</span>
              <span>履歴に記録されます</span>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRevisionPromptOpen(false);
                  revisionConfirmedRef.current = false;
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleRevisionConfirm}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                disabled={isUploading}
              >
                この内容で更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エラーモーダル */}
      {errorModalMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">エラー</h3>
              {typeof errorModalMessage === 'string' && errorModalMessage.includes('DB_BUSY') ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    アップロードエラー: アップロードに失敗しました。{'\n'}DB_BUSYの為、時間を空けて再度作成ボタンを押してください。
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">エラーログ:</p>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                      {errorModalMessage && (
                        <div className="mb-2">
                          <span className="font-semibold">詳細: </span>
                          {errorModalMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {errorModalMessage}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setErrorModalMessage(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
