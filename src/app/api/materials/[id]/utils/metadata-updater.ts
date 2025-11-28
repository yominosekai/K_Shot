// メタデータ更新処理

import { writeFile } from 'fs/promises';
import path from 'path';
import { readJSON, writeJSON } from '@/shared/lib/file-system/json';
import { info, debug } from '@/shared/lib/logger';
import type { MaterialNormalized } from '@/features/materials/types';

const MODULE_NAME = 'api/materials/[id]/utils/metadata-updater';

interface UpdateMetadataParams {
  materialId: string;
  uploadDir: string;
  existingMaterial: MaterialNormalized;
  title: string;
  description: string;
  category_id: string;
  type: string;
  difficulty: string;
  estimated_hours: string | null;
  tags: string;
  folderPath: string;
  content: string;
  attachmentList: Array<{
    filename: string;
    original_filename?: string;
    size: number;
    type: string;
    relativePath?: string;
  }>;
}

/**
 * メタデータとdocument.mdを更新
 */
export async function updateMaterialMetadata({
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
}: UpdateMetadataParams): Promise<void> {
  // document.mdを更新
  if (content !== undefined) {
    const documentPath = path.join(uploadDir, 'document.md');
    await writeFile(documentPath, content, 'utf-8');
    debug(MODULE_NAME, `document.md更新: ${documentPath}`);
  }

  // メタデータを更新
  const now = new Date().toISOString();
  const metadataPath = path.join(uploadDir, 'metadata.json');
  
  let metadata: any = {};
  try {
    metadata = await readJSON(metadataPath);
  } catch {
    // metadata.jsonが存在しない場合は新規作成
    metadata = {
      id: materialId,
      uuid: existingMaterial.uuid,
      created_by: existingMaterial.created_by,
      created_date: existingMaterial.created_date,
    };
  }

  // メタデータを更新
  metadata.title = title;
  metadata.description = description;
  metadata.category_id = category_id;
  metadata.type = type as 'document' | 'presentation' | 'video' | 'link' | 'other';
  metadata.difficulty = difficulty || undefined;
  metadata.estimated_hours = estimated_hours ? parseFloat(estimated_hours) : undefined;
  metadata.tags = tags ? tags.split(',').map((tag) => tag.trim()).filter((tag) => tag) : [];
  metadata.folder_path = folderPath;
  metadata.updated_date = now;
  metadata.attachments = attachmentList;

  await writeJSON(metadataPath, metadata);
  debug(MODULE_NAME, `metadata.json更新: ${metadataPath}`);
}


