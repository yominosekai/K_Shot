// CSVファイル操作ユーティリティ

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * CSVファイルを読み込んでオブジェクト配列に変換
 */
export async function readCSV(filePath: string): Promise<any[]> {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = await readFile(filePath, 'utf-8');
    const lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim() !== '');

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSVの値を正しく分割（カンマ区切り、ダブルクォート対応）
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length !== headers.length) {
        console.warn(
          `Skipping malformed CSV line ${i + 1}: expected ${headers.length} columns, got ${values.length}`
        );
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

/**
 * オブジェクト配列をCSVファイルに書き込み
 */
export async function writeCSV(filePath: string, data: any[]): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    let headers: string[];
    let csvContent: string;

    if (data.length === 0) {
      // 空の場合は、既存のCSVファイルからヘッダーを取得するか、空のCSVファイルを作成
      // 既存ファイルがある場合は読み込んでヘッダーを取得
      if (fs.existsSync(filePath)) {
        try {
          const existingContent = await readFile(filePath, 'utf-8');
          const lines = existingContent.split('\n').filter((line) => line.trim() !== '');
          if (lines.length > 0) {
            // ヘッダーのみのCSVファイルを作成
            await writeFile(filePath, lines[0] + '\n', 'utf-8');
            return;
          }
        } catch (err) {
          // 読み込みに失敗した場合は、空のCSVファイルを作成しない（エラーをスロー）
          console.error(`Error reading existing CSV file ${filePath}:`, err);
          throw new Error(`既存のCSVファイルを読み込めませんでした: ${err}`);
        }
      }
      // 既存ファイルがない場合は、何もしない（新規作成時はデータが必要）
      return;
    }

    headers = Object.keys(data[0]);
    csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ''}"`).join(',')
      ),
    ].join('\n');

    await writeFile(filePath, csvContent, 'utf-8');
  } catch (error) {
    console.error(`Error writing CSV file ${filePath}:`, error);
    throw error;
  }
}

