// 共有資料アップロードAPI

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DRIVE_CONFIG } from '@/config/drive';
import { writeJSON } from '@/shared/lib/file-system/json';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { logBusyError } from '@/shared/lib/database/busy-monitor';
import { addMaterialRevision } from '@/shared/lib/data-access/material-revisions';

const MODULE_NAME = 'api/materials/upload';

/**
 * POST /api/materials/upload
 * 共有資料をアップロード
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // 基本情報を取得
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const category_id = formData.get('category_id') as string;
    const difficulty = formData.get('difficulty') as string;
    const estimated_hours = formData.get('estimated_hours') as string;
    const tags = formData.get('tags') as string;
    const content = formData.get('content') as string; // document.mdの内容
    const userId = formData.get('user_id') as string; // 作成者のユーザーID
    const folderPath = (formData.get('folder_path') as string) || ''; // フォルダパス
    const userDisplayName = (formData.get('user_display_name') as string) || '';

    // バリデーション
    if (!title || !description || !type || !category_id) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が取得できません' },
        { status: 401 }
      );
    }

    // 新しい資料IDを生成
    const materialId = Date.now().toString();
    const directoryName = `material_${materialId}`;

    // 保存先パス（フォルダパスに基づいて構築）
    // サーバーベース方式: 常にネットワークドライブに保存
    const drivePath = DRIVE_CONFIG.DATA_DIR;
    
    // フォルダパスがある場合は、folders配下に配置
    let materialDir: string;
    if (folderPath && folderPath.trim() !== '') {
      // フォルダパスを正規化（スラッシュをパス区切り文字に変換）
      const normalizedFolderPath = folderPath.replace(/\//g, path.sep);
      materialDir = path.join('shared', 'shared_materials', 'folders', normalizedFolderPath, directoryName);
    } else {
      // フォルダパスがない場合は未分類フォルダに配置
      materialDir = path.join('shared', 'shared_materials', 'uncategorized', directoryName);
    }

    // 常にネットワークドライブに保存
    const uploadDir = path.join(drivePath, materialDir);

    // 保存先ディレクトリを作成
    await mkdir(uploadDir, { recursive: true });
    debug(MODULE_NAME, `ディレクトリ作成: ${uploadDir}`);

    // attachmentsディレクトリを作成
    const attachmentsDir = path.join(uploadDir, 'attachments');
    await mkdir(attachmentsDir, { recursive: true });

    // アップロードされたファイルを処理
    const files = formData.getAll('files') as File[];
    const relativePathsJson = formData.get('relativePaths') as string | null;
    const relativePathMap: Record<string, string> = relativePathsJson
      ? JSON.parse(relativePathsJson)
      : {};

    const attachmentList: Array<{
      filename: string;
      original_filename?: string;
      size: number;
      type: string;
      relativePath?: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 0バイトファイルもアップロード可能にする
        // relativePathを取得（元のファイル名をキーとして使用）
        const relativePath = relativePathMap[file.name] || undefined;

        // ファイル名を安全にする（Windowsで使用できない文字のみを置き換え、2バイト文字は保持）
        // Windowsで使用できない文字: < > : " | ? * \ / および制御文字
        const sanitizeFileName = (fileName: string): string => {
          return fileName
            .replace(/[<>:"|?*\\\/]/g, '_') // Windowsで使用できない文字を置き換え
            .replace(/[\x00-\x1F]/g, '_') // 制御文字を置き換え
            .replace(/^\.+/, '') // 先頭のピリオドを削除
            .replace(/\.+$/, '') // 末尾のピリオドを削除
            .replace(/^ +| +$/g, '') // 先頭・末尾のスペースを削除
            .replace(/\.\.+/g, '.') // 連続するピリオドを1つに
            .trim(); // トリム
        };

        let safeFileName = sanitizeFileName(file.name);
        
        // 空になった場合はデフォルト名を使用
        if (!safeFileName || safeFileName.length === 0) {
          const ext = path.extname(file.name) || '';
          safeFileName = `file_${i + 1}${ext}`;
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

        attachmentList.push({
          filename: safeRelativePath ? safeRelativePath.split('/').pop() || safeFileName : safeFileName,
          original_filename: file.name, // 元のファイル名も保存
          size: file.size,
          type: file.type,
          relativePath: savedRelativePath, // フォルダ構造を保持
        });
    }

    // document.mdを作成
    if (content && content.trim()) {
      const documentPath = path.join(uploadDir, 'document.md');
      await writeFile(documentPath, content, 'utf-8');
      debug(MODULE_NAME, `document.md作成: ${documentPath}`);
    }

    // UUIDを生成
    const uuid = uuidv4();
    const now = new Date().toISOString();

    // メタデータを作成
    const metadata = {
      id: materialId,
      uuid: uuid,
      title,
      description,
      category_id,
      type: type as 'document' | 'presentation' | 'video' | 'link' | 'other',
      difficulty: difficulty || undefined,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : undefined,
      tags: tags ? tags.split(',').map((tag) => tag.trim()).filter((tag) => tag) : [],
      folder_path: folderPath, // フォルダパスを追加
      created_by: userId,
      created_date: now,
      updated_date: now,
      is_published: true,
      views: 0,
      likes: 0,
      attachments: attachmentList,
    };

    // metadata.jsonを保存
    const metadataPath = path.join(uploadDir, 'metadata.json');
    await writeJSON(metadataPath, metadata);
    debug(MODULE_NAME, `metadata.json作成: ${metadataPath}`);

    // SQLiteに追加（リトライ処理付き）
    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO materials (
        id, uuid, title, description, category_id, type, difficulty, estimated_hours,
        tags, folder_path, created_by, created_date, updated_date,
        is_published, views, likes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const params = [
      materialId,
      uuid,
      title,
      description || null,
      category_id || null,
      type,
      difficulty || null,
      estimated_hours ? parseFloat(estimated_hours) : null,
      tags || '',
      folderPath || '',
      userId,
      now,
      now,
      1, // is_published
      0, // views
      0  // likes
    ];
    
    // リトライ処理（最大5回、指数バックオフ）
    const maxRetries = 5;
    let retryCount = 0;
    let lastError: any = null;
    
    while (retryCount < maxRetries) {
      try {
        insert.run(...params);
        if (retryCount > 0) {
          debug(
            MODULE_NAME,
            `SQLiteに資料を追加成功（リトライ ${retryCount}回後）: materialId=${materialId}`
          );
          // SQLITE_BUSYが発生したが最終的に成功した場合のログ
          await logBusyError(userId, 'uploadMaterial', retryCount, true, { materialId, title });
        } else {
          debug(MODULE_NAME, `SQLiteに資料を追加: materialId=${materialId}`);
        }
        break; // 成功したらループを抜ける
      } catch (err: any) {
        lastError = err;
        // SQLITE_BUSYエラーの場合のみリトライ
        if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 50 * retryCount; // 50ms, 100ms, 150ms, 200ms
          debug(MODULE_NAME, `SQLite書き込み競合検出（リトライ ${retryCount}回目）: materialId=${materialId}, ${waitTime}ms待機`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        // それ以外のエラーまたは最大リトライ回数に達した場合はエラーを投げる
        throw err;
      }
    }
    
    if (retryCount >= maxRetries && lastError) {
      error(
        MODULE_NAME,
        `SQLite書き込み失敗（最大リトライ回数に達しました）: materialId=${materialId}`,
        lastError
      );
      // SQLITE_BUSYが発生して最終的に失敗した場合のログ
      await logBusyError(userId, 'uploadMaterial', retryCount, false, { materialId, title });
      throw lastError;
    }

    await addMaterialRevision({
      materialId,
      updatedBy: userId,
      updatedByName: userDisplayName || undefined,
      comment: '初回登録',
    });

    return NextResponse.json({
      success: true,
      message: '資料が正常にアップロードされました',
      material: {
        id: materialId,
        uuid: uuid,
        title,
        description,
        category_id,
        type,
        tags: metadata.tags,
        folder_path: folderPath,
        created_by: userId,
        created_date: now,
        updated_date: now,
        is_published: true,
        views: 0,
        likes: 0,
        attachments: attachmentList,
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'アップロードエラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'アップロードに失敗しました',
      },
      { status: 500 }
    );
  }
}

