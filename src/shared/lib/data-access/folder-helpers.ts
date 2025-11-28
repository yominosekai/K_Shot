import path from 'path';
import type { FolderNormalized } from '@/features/materials/types';

const INVALID_FOLDER_CHARS = /[<>:"|?*\\\/]/g;
const CONTROL_CHARS = /[\x00-\x1F]/g;

export function sanitizeFolderName(folderName: string): string {
  return folderName
    .replace(INVALID_FOLDER_CHARS, '_')
    .replace(CONTROL_CHARS, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/^ +| +$/g, '')
    .replace(/\.\.+/g, '.')
    .trim();
}

export function buildFolderPath(
  parentPath: string | null | undefined,
  folderName: string
): string {
  const trimmedParent = parentPath?.trim();
  if (!trimmedParent) {
    return folderName;
  }
  return `${trimmedParent}/${folderName}`;
}

export function resolveFolderPhysicalPath(drivePath: string, folderPath: string): string {
  const relative = folderPath.replace(/\//g, path.sep);
  return path.join(drivePath, 'shared', 'shared_materials', 'folders', relative);
}

export interface FolderRow {
  id: string;
  name: string;
  parent_id?: string | null;
  path?: string | null;
  created_by: string;
  created_date: string;
}

export function normalizeFolderRow(row: FolderRow): FolderNormalized {
  return {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id || '',
    path: row.path || '',
    created_by: row.created_by,
    created_date: row.created_date,
  };
}

