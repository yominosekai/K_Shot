// 資料フォームの送信処理フック

import { useState, useCallback } from 'react';
import type { MaterialFormData, UploadedFile } from './useMaterialFormState';
import type { MaterialNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';

interface UseMaterialFormSubmitProps {
  formData: MaterialFormData;
  uploadedFiles: UploadedFile[];
  user: User | null;
  isEditMode: boolean;
  editMaterial: MaterialNormalized | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  resetForm: () => void;
  getRevisionReason?: () => string;
}

export function useMaterialFormSubmit({
  formData,
  uploadedFiles,
  user,
  isEditMode,
  editMaterial,
  onSuccess,
  onError,
  resetForm,
  getRevisionReason,
}: UseMaterialFormSubmitProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!user?.id) {
        onError('ユーザー情報が取得できません');
        return;
      }

      setIsUploading(true);
      setUploadMessage('アップロード中...');
      setUploadProgress(0);

      try {
        const formDataToSend = new FormData();

        // 基本情報を追加
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('type', formData.type);
        formDataToSend.append('category_id', formData.category_id);
        formDataToSend.append('difficulty', formData.difficulty);
        formDataToSend.append('estimated_hours', formData.estimated_hours.toString());
        formDataToSend.append('tags', formData.tags);
        formDataToSend.append('content', formData.content);
        formDataToSend.append('folder_path', formData.folder_path || '');
        formDataToSend.append('user_id', user.id);

        if (user.display_name) {
          formDataToSend.append('user_display_name', user.display_name);
        }

        if (isEditMode) {
          const revisionReason = getRevisionReason?.() || '';
          formDataToSend.append('revision_reason', revisionReason);
        }

        // 編集モードの場合、既存ファイルと新規ファイルを区別
        if (isEditMode && editMaterial) {
          // 既存の添付ファイルリスト
          const existingAttachments = editMaterial.attachments || [];
          const existingFilenames = new Set(existingAttachments.map(att => att.filename));
          
          // 現在表示されているファイル（既存ファイル + 新規ファイル）
          const currentFilenames = new Set<string>();
          const newFiles: File[] = [];
          
          uploadedFiles.forEach((fileObj) => {
            // 既存ファイルかどうかを判定（IDが`existing-`で始まる、またはファイルサイズが0のダミーファイル）
            const isExisting = fileObj.id.startsWith('existing-') || fileObj.file.size === 0;
            
            if (isExisting) {
              // 既存ファイルの場合、ファイル名を記録（保持される）
              const filename = fileObj.name;
              // 既存ファイルのfilenameを取得（attachmentsから）
              const attachment = existingAttachments.find(att => 
                (att.original_filename || att.filename) === filename
              );
              if (attachment) {
                currentFilenames.add(attachment.filename);
              }
            } else {
              // 新規ファイルの場合、アップロード
              newFiles.push(fileObj.file);
            }
          });
          
          // 削除された既存ファイルを特定
          const deletedFilenames = existingAttachments
            .filter(att => !currentFilenames.has(att.filename))
            .map(att => att.filename);
          
          // 削除リストを送信
          if (deletedFilenames.length > 0) {
            formDataToSend.append('delete_attachments', JSON.stringify(deletedFilenames));
          }
          
          // 新規ファイルを追加（relativePathも送信）
          newFiles.forEach((file) => {
            formDataToSend.append('files', file);
            // 対応するrelativePathを取得
            const fileObj = uploadedFiles.find(f => f.file === file);
            if (fileObj?.relativePath) {
              formDataToSend.append(`relativePath_${file.name}`, fileObj.relativePath);
            }
          });
        } else {
          // 新規作成モードの場合、すべてのファイルをアップロード（relativePathも送信）
          const relativePathMap: Record<string, string> = {};
          uploadedFiles.forEach((fileObj) => {
            formDataToSend.append('files', fileObj.file);
            if (fileObj.relativePath) {
              relativePathMap[fileObj.name] = fileObj.relativePath;
            }
          });
          // relativePathのマッピングをJSONで送信
          if (Object.keys(relativePathMap).length > 0) {
            formDataToSend.append('relativePaths', JSON.stringify(relativePathMap));
          }
        }

        setUploadMessage(isEditMode ? '更新中...' : 'ファイル転送中...');

        // XMLHttpRequestを使用してプログレスバーを実装
        const result = await new Promise<any>((resolve, reject) => {
          let uploadError: Error | null = null;
          const xhr = new XMLHttpRequest();

          // アップロード進捗を監視
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 90); // 90%まで（残り10%はDB保存用）
              setUploadProgress(percentComplete);
              if (percentComplete < 90) {
                setUploadMessage(`ファイル転送中... ${percentComplete}% → Next: ファイル保存、メタデータ作成`);
              } else {
                setUploadMessage('ファイル転送完了 → Next: ファイル保存、メタデータ作成');
              }
            }
          });

          // リクエスト完了時
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
              } catch (err) {
                reject(new Error('レスポンスの解析に失敗しました'));
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText);
                // エラーの詳細情報を含める
                const errorMessage = error.error || 'アップロードに失敗しました';
                const errorDetail = error.errorDetail;
                const errorCode = error.errorCode;
                
                // DB_BUSYエラー（SQLITE_BUSYまたはSQLITE_CANTOPEN_ISDIR）の場合は特別なエラーオブジェクトを作成
                if (errorMessage === 'DB_BUSY' || errorCode === 'SQLITE_BUSY' || errorCode === 'SQLITE_CANTOPEN_ISDIR') {
                  const errorObj = new Error('DB_BUSY');
                  (errorObj as any).errorDetail = errorDetail;
                  (errorObj as any).errorCode = errorCode;
                  (errorObj as any).errorStack = error.errorStack;
                  (errorObj as any).isDatabaseBusy = true;
                  uploadError = errorObj;
                  reject(errorObj);
                  return;
                }
                
                let fullErrorMessage = errorMessage;
                if (errorDetail && process.env.NODE_ENV === 'development') {
                  fullErrorMessage += ` (詳細: ${errorDetail})`;
                }
                if (errorCode) {
                  fullErrorMessage += ` [コード: ${errorCode}]`;
                }
                
                const errorObj = new Error(fullErrorMessage);
                (errorObj as any).errorDetail = errorDetail;
                (errorObj as any).errorCode = errorCode;
                (errorObj as any).errorStack = error.errorStack;
                uploadError = errorObj;
                reject(errorObj);
              } catch {
                reject(new Error(`アップロードに失敗しました (${xhr.status})`));
              }
            }
          });

          // エラー時
          xhr.addEventListener('error', () => {
            const error = new Error('ネットワークエラーが発生しました');
            if (uploadError) {
              (error as any).originalError = uploadError;
            }
            reject(error);
          });

          // 中断時
          xhr.addEventListener('abort', () => {
            const error = new Error('アップロードが中断されました');
            if (uploadError) {
              (error as any).originalError = uploadError;
            }
            reject(error);
          });

          // リクエスト送信
          if (isEditMode && editMaterial) {
            xhr.open('PUT', `/api/materials/${editMaterial.id}`);
          } else {
            xhr.open('POST', '/api/materials/upload');
          }
          xhr.send(formDataToSend);
        });

        // ファイル転送完了後、サーバー側処理
        setUploadProgress(92);
        setUploadMessage('ファイル保存、メタデータ作成中... → Next: データベース保存');
        await new Promise((resolve) => setTimeout(resolve, 100)); // 少し待ってから次のステップへ

        // データベース保存
        setUploadProgress(95);
        setUploadMessage('データベース保存中... → Next: 完了');

        if (result.success) {
          setUploadProgress(100);
          setUploadMessage(isEditMode ? '更新完了！' : 'アップロード完了！');
          // 少し待ってからモーダルを閉じる（完了メッセージを見せるため）
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!isEditMode) {
            resetForm();
          }
          onSuccess();
        } else {
          throw new Error(result.error || (isEditMode ? '更新に失敗しました' : 'アップロードに失敗しました'));
        }
      } catch (error) {
        console.error(isEditMode ? '更新エラー:' : 'アップロードエラー:', error);
        setUploadProgress(0);
        setUploadMessage(isEditMode ? '更新に失敗しました' : 'アップロードに失敗しました');
        // エラーメッセージを少し表示してからalert
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // エラーオブジェクトを構築（DB_BUSYエラーの場合は詳細情報を含める）
        const errorObj = error instanceof Error ? error : new Error(String(error));
        if ((errorObj as any).isDatabaseBusy) {
          // DB_BUSYエラーの場合は、詳細情報を含めたエラーメッセージを渡す
          const errorDetail = (errorObj as any).errorDetail || errorObj.message;
          const errorCode = (errorObj as any).errorCode || '';
          const errorMessage = `DB_BUSY${errorDetail ? `: ${errorDetail}` : ''}${errorCode ? ` [${errorCode}]` : ''}`;
          onError(errorMessage);
        } else {
          onError((isEditMode ? '更新エラー: ' : 'アップロードエラー: ') + errorObj.message);
        }
      } finally {
        setIsUploading(false);
        setUploadMessage('');
        setUploadProgress(0);
      }
    },
    [formData, uploadedFiles, user, onSuccess, onError, resetForm, isEditMode, editMaterial, getRevisionReason]
  );

  return {
    isUploading,
    uploadMessage,
    uploadProgress,
    handleSubmit,
  };
}

