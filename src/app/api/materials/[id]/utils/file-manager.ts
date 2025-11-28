// ファイル管理処理

import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/materials/[id]/utils/file-manager';

/**
 * ファイル名を安全にする
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"|?*\\\/]/g, '_')
    .replace(/[\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/^ +| +$/g, '')
    .replace(/\.\.+/g, '.')
    .trim();
}

/**
 * 添付ファイルを削除
 */
export async function deleteAttachmentFiles(
  attachmentsDir: string,
  deleteList: string[],
  existingAttachments: Array<{ filename: string; relativePath?: string }>
): Promise<void> {
  for (const filename of deleteList) {
    // 既存の添付ファイルからrelativePathを取得
    const attachment = existingAttachments.find(att => att.filename === filename);
    const filePathToDelete = attachment?.relativePath 
      ? path.join(attachmentsDir, attachment.relativePath)
      : path.join(attachmentsDir, filename);
    
    try {
      await unlink(filePathToDelete);
      debug(MODULE_NAME, `添付ファイル削除: ${filePathToDelete}`);
    } catch (err) {
      error(MODULE_NAME, `添付ファイル削除エラー: ${filePathToDelete}`, err);
    }
  }
}

/**
 * 新しい添付ファイルを保存
 */
export async function saveNewAttachments(
  attachmentsDir: string,
  files: File[],
  relativePathMap: Record<string, string>
): Promise<Array<{
  filename: string;
  original_filename?: string;
  size: number;
  type: string;
  relativePath?: string;
}>> {
  const newAttachments: Array<{
    filename: string;
    original_filename?: string;
    size: number;
    type: string;
    relativePath?: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > 0) {
      // relativePathを取得
      const relativePath = relativePathMap[file.name] || undefined;

      let safeFileName = sanitizeFileName(file.name);
      
      if (!safeFileName || safeFileName.length === 0) {
        const ext = path.extname(file.name) || '';
        safeFileName = `file_${Date.now()}_${i + 1}${ext}`;
      }

      // relativePathがある場合、パスも安全化
      let safeRelativePath: string | undefined = undefined;
      if (relativePath) {
        const pathParts = relativePath.split('/').map(part => sanitizeFileName(part));
        safeRelativePath = pathParts.join('/');
      }

      // ファイルのバイトデータを取得
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 保存先パスを決定（relativePathがある場合はフォルダ構造を保持）
      let filePath: string;
      let savedRelativePath: string | undefined = undefined;
      
      if (safeRelativePath) {
        // フォルダ構造を保持して保存
        const pathParts = safeRelativePath.split('/');
        const fileName = pathParts.pop() || safeFileName;
        const dirPath = pathParts.length > 0 ? path.join(...pathParts) : '';
        
        if (dirPath) {
          // サブディレクトリを作成
          const subDir = path.join(attachmentsDir, dirPath);
          await mkdir(subDir, { recursive: true });
          filePath = path.join(subDir, fileName);
          savedRelativePath = safeRelativePath;
        } else {
          // ルート直下
          filePath = path.join(attachmentsDir, fileName);
          savedRelativePath = fileName;
        }
      } else {
        // relativePathがない場合はルート直下に保存
        filePath = path.join(attachmentsDir, safeFileName);
      }

      await writeFile(filePath, buffer);
      debug(MODULE_NAME, `ファイル保存: ${filePath} (元のファイル名: ${file.name}, relativePath: ${savedRelativePath || 'なし'})`);

      newAttachments.push({
        filename: safeRelativePath ? safeRelativePath.split('/').pop() || safeFileName : safeFileName,
        original_filename: file.name,
        size: file.size,
        type: file.type,
        relativePath: savedRelativePath,
      });
    }
  }

  return newAttachments;
}


