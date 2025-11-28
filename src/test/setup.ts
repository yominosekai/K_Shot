import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';
import { rmSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

// テスト用データディレクトリ
const TEST_DATA_DIR = path.resolve(__dirname, '../../test-data');

beforeAll(() => {
  // テスト用ディレクトリを作成（存在しない場合のみ）
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  
  // テスト環境変数を設定（NODE_ENVは読み取り専用なので設定しない）
  // NODE_ENVはvitest.config.tsで設定される
  process.env.DATA_DIR = TEST_DATA_DIR;
  process.env.DATABASE_PATH = path.join(TEST_DATA_DIR, 'test.db');
});

afterAll(() => {
  // テスト終了後にテスト用ディレクトリを削除（オプション）
  // デバッグ時はコメントアウトしてデータを残すことも可能
  // if (existsSync(TEST_DATA_DIR)) {
  //   rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  // }
});

