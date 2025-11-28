// PUT処理: 資料を更新

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { DRIVE_CONFIG } from '@/config/drive';
import { mkdir } from 'fs/promises';
import path from 'path';
import { info, error, debug } from '@/shared/lib/logger';
import { deleteAttachmentFiles, saveNewAttachments } from '../utils/file-manager';
import { updateMaterialMetadata } from '../utils/metadata-updater';
import { updateMaterialInDatabase } from '../utils/database-updater';
import { addMaterialRevision } from '@/shared/lib/data-access/material-revisions';

const MODULE_NAME = 'api/materials/[id]/handlers/put';

/**
 * PUT /api/materials/[id]
 * 資料を更新
 */
export async function handlePut(
  request: NextRequest,
  materialId: string
): Promise<NextResponse> {
  try {
    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    // 既存の資料を取得
    const existingMaterial = await getMaterialDetail(materialId);
    if (!existingMaterial) {
      return NextResponse.json(
        {
          success: false,
          error: '資料が見つかりません',
        },
        { status: 404 }
      );
    }

    // 基本情報を取得
    const title = (formData.get('title') as string) || existingMaterial.title;
    const description = (formData.get('description') as string) || existingMaterial.description;
    const type = (formData.get('type') as string) || existingMaterial.type;
    const category_id = (formData.get('category_id') as string) || existingMaterial.category_id;
    const difficulty = (formData.get('difficulty') as string) || existingMaterial.difficulty || '';
    const estimated_hours = formData.get('estimated_hours') as string;
    const tags = (formData.get('tags') as string) || (existingMaterial.tags?.join(',') || '');
    const content = (formData.get('content') as string) || existingMaterial.document || '';
    const userSid = formData.get('user_sid') as string;
    const userDisplayName = (formData.get('user_display_name') as string) || '';
    const revisionReason = (formData.get('revision_reason') as string) || '';
    const folderPath = (formData.get('folder_path') as string) || existingMaterial.folder_path || '';

    // バリデーション
    if (!title || !description || !type || !category_id) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    if (!userSid) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 401 }
      );
    }

    const drivePath = DRIVE_CONFIG.DATA_DIR;

    // 既存の資料ディレクトリを取得
    let materialDir: string;
    if (existingMaterial.folder_path && existingMaterial.folder_path.trim() !== '') {
      const normalizedFolderPath = existingMaterial.folder_path.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, `material_${materialId}`);
    } else {
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', `material_${materialId}`);
    }

    const uploadDir = path.join(drivePath, materialDir);

    // ディレクトリが存在しない場合は作成
    await mkdir(uploadDir, { recursive: true });
    debug(MODULE_NAME, `ディレクトリ確認/作成: ${uploadDir}`);

    // attachmentsディレクトリを作成
    const attachmentsDir = path.join(uploadDir, 'attachments');
    await mkdir(attachmentsDir, { recursive: true });

    // 既存の添付ファイルリストを取得
    let existingAttachments = existingMaterial.attachments || [];
    
    // 削除する添付ファイルのリスト（オプション）
    const deleteAttachments = formData.get('delete_attachments') as string;
    if (deleteAttachments) {
      const deleteList = JSON.parse(deleteAttachments) as string[];
      // 削除対象のファイルを物理的に削除
      await deleteAttachmentFiles(attachmentsDir, deleteList, existingAttachments);
      // 添付ファイルリストから削除
      existingAttachments = existingAttachments.filter(
        (att) => !deleteList.includes(att.filename)
      );
    }

    // 新しいファイルをアップロード
    const files = formData.getAll('files') as File[];
    
    // relativePathのマッピングを取得（編集時は個別に送信される可能性がある）
    const relativePathMap: Record<string, string> = {};
    files.forEach((file) => {
      const relativePathKey = `relativePath_${file.name}`;
      const relativePathValue = formData.get(relativePathKey) as string | null;
      if (relativePathValue) {
        relativePathMap[file.name] = relativePathValue;
      }
    });

    const newAttachments = await saveNewAttachments(attachmentsDir, files, relativePathMap);

    // 添付ファイルリストを結合
    const attachmentList = [...existingAttachments, ...newAttachments];

    // メタデータとdocument.mdを更新
    await updateMaterialMetadata({
      materialId,
      uploadDir,
      existingMaterial,
      title,
      description,
      category_id,
      type,
      difficulty,
      estimated_hours,
      tags,
      folderPath,
      content,
      attachmentList,
    });

    // SQLiteを更新（リトライ処理付き）
    const now = new Date().toISOString();
    await updateMaterialInDatabase(materialId, userSid, {
      title,
      description: description || null,
      category_id: category_id || null,
      type,
      difficulty: difficulty || null,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null,
      tags: tags || '',
      folderPath: folderPath || '',
      now,
    });

    // 更新後の資料を取得
    await addMaterialRevision({
      materialId,
      updatedBy: userSid,
      updatedByName: userDisplayName || undefined,
      comment: revisionReason || undefined,
    });

    const updatedMaterial = await getMaterialDetail(materialId);

    return NextResponse.json({
      success: true,
      message: '資料が正常に更新されました',
      material: updatedMaterial,
    });
  } catch (err) {
    error(MODULE_NAME, '資料更新エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: '資料の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}


