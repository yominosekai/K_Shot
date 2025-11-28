// ファイルアップロードエリアコンポーネント

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import AttachmentTreeView from './AttachmentTreeView';
import type { Attachment } from '@/features/materials/types';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string; // フォルダ構造を保持するための相対パス
}

interface FileUploadAreaProps {
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export default function FileUploadArea({
  uploadedFiles,
  onFilesChange,
}: FileUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // フォルダ内のファイルを再帰的に取得
  const traverseDirectory = async (
    entry: FileSystemEntry,
    basePath: string = '',
    files: UploadedFile[] = []
  ): Promise<UploadedFile[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((file) => {
          const relativePath = basePath ? `${basePath}/${file.name}` : file.name;
          files.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            relativePath,
          });
          resolve(files);
        });
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();
      const entries: FileSystemEntry[] = [];

      return new Promise((resolve) => {
        const readEntries = () => {
          dirReader.readEntries((results) => {
            if (results.length === 0) {
              // すべてのエントリを読み込んだ
              Promise.all(
                entries.map((subEntry) => {
                  // サブエントリがファイルの場合は、basePathをそのまま使用（ファイル名は後で追加される）
                  // サブエントリがフォルダの場合は、basePathにフォルダ名を追加
                  const subPath = subEntry.isDirectory
                    ? (basePath ? `${basePath}/${subEntry.name}` : subEntry.name)
                    : basePath; // ファイルの場合はbasePathをそのまま使用
                  return traverseDirectory(subEntry, subPath, files);
                })
              ).then(() => {
                resolve(files);
              });
            } else {
              entries.push(...results);
              readEntries(); // 続きを読み込む
            }
          });
        };
        readEntries();
      });
    }
    return Promise.resolve(files);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      // 通常のファイル選択ではrelativePathは設定しない（ルート直下）
    }));

    onFilesChange([...uploadedFiles, ...newFiles]);
  };

  const handleFileRemove = (id: string) => {
    onFilesChange(uploadedFiles.filter((f) => f.id !== id));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const newFiles: UploadedFile[] = [];

    // 各アイテムを処理
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // webkitGetAsEntry()でフォルダ/ファイルを取得
      const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntry | null;
      
      if (entry) {
        if (entry.isDirectory) {
          // フォルダの場合：再帰的にファイルを取得（フォルダ名をbasePathとして渡す）
          const folderName = entry.name;
          const folderFiles = await traverseDirectory(entry, folderName);
          newFiles.push(...folderFiles);
        } else if (entry.isFile) {
          // ファイルの場合：通常のファイルとして処理
          await new Promise<void>((resolve) => {
            (entry as FileSystemFileEntry).file((file) => {
              newFiles.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                // 単一ファイルはルート直下
              });
              resolve();
            });
          });
        }
      } else {
        // webkitGetAsEntry()が使えない場合（Safariなど）は通常のファイル処理
        const file = item.getAsFile();
        if (file) {
          newFiles.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        }
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...uploadedFiles, ...newFiles]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        添付資料
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <div className="text-center">
          <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            ファイルまたはフォルダをドラッグ&ドロップするか、
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-500 hover:text-blue-600 underline ml-1"
            >
              クリックして選択
            </button>
          </p>
        </div>
      </div>

      {/* アップロード済みファイル一覧（ツリービュー） */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <AttachmentTreeView
            attachments={uploadedFiles.map((fileObj) => ({
              filename: fileObj.name,
              original_filename: fileObj.name,
              size: fileObj.size,
              type: fileObj.type,
              relativePath: fileObj.relativePath,
            }))}
            rootLabel="添付資料"
            onFileDelete={(filename) => {
              // filenameで検索（relativePathがある場合は最後のファイル名部分で検索）
              const fileToRemove = uploadedFiles.find((f) => {
                if (f.relativePath) {
                  const pathParts = f.relativePath.split('/');
                  return pathParts[pathParts.length - 1] === filename;
                }
                return f.name === filename;
              });
              if (fileToRemove) {
                handleFileRemove(fileToRemove.id);
              }
            }}
            showActions={true}
          />
        </div>
      )}
    </div>
  );
}

