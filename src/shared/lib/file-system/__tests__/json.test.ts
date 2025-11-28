import { describe, it, expect } from 'vitest';
import { readJSON, writeJSON } from '../json';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

// 実際のファイルシステムを使用するテスト（テスト用ディレクトリ）
const TEST_DATA_DIR = path.resolve(__dirname, '../../../../test-data');
const TEST_JSON_PATH = path.join(TEST_DATA_DIR, 'test.json');

describe('JSONファイル操作', () => {
  // テスト後にクリーンアップ
  afterEach(() => {
    if (existsSync(TEST_JSON_PATH)) {
      try {
        unlinkSync(TEST_JSON_PATH);
      } catch (err) {
        // エラーは無視
      }
    }
  });

  it('JSONファイルを読み書きできる', async () => {
    const testData = { test: 'data', number: 123 };
    
    // 書き込み
    await writeJSON(TEST_JSON_PATH, testData);
    
    // 読み込み
    const result = await readJSON(TEST_JSON_PATH);
    
    expect(result).toEqual(testData);
  });

  it('存在しないJSONファイルを読み込むとnullを返す', async () => {
    const result = await readJSON(path.join(TEST_DATA_DIR, 'nonexistent.json'));
    
    expect(result).toBeNull();
  });

  it('JSONファイルに配列を書き込める', async () => {
    const data = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
    
    await writeJSON(TEST_JSON_PATH, data);
    
    const result = await readJSON(TEST_JSON_PATH);
    expect(result).toEqual(data);
  });
});

