// 「とみた」ユーザーの証明ファイルを作成するスクリプト

import fs from 'fs';
import path from 'path';
import os from 'os';

// データベースから取得した情報
const DEVICE_TOKEN_DATA = {
  schema_version: '1.0.0',
  token: '1e12a1ec-5c80-44d4-9f3d-8d34c5a74cc4',
  signature: '859d0454b1653c499efd197bcc29bf8a9df84db8bc9c485935dd1a1edddef95b',
  user_sid: '3d396eb3-656b-4d12-b890-0701f83a0463',
  issued_at: '2025-11-24T16:25:57.113Z',
  device_label: 'device-33327b',
  signature_version: 1
};

function resolveDefaultTokenDir(): string {
  if (process.env.LMS_DEVICE_TOKEN_DIR) {
    return process.env.LMS_DEVICE_TOKEN_DIR;
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'k-shot', 'credentials');
  }

  return path.join(os.homedir(), '.k-shot', 'credentials');
}

const TOKEN_FILE_NAME = 'device-token.json';

function getDeviceTokenFilePath(): string {
  if (process.env.LMS_DEVICE_TOKEN_FILE) {
    return process.env.LMS_DEVICE_TOKEN_FILE;
  }

  const defaultDir = resolveDefaultTokenDir();
  return path.join(defaultDir, TOKEN_FILE_NAME);
}

async function createDeviceTokenFile() {
  const tokenPath = getDeviceTokenFilePath();
  const dir = path.dirname(tokenPath);

  console.log('証明ファイルの保存先:', tokenPath);
  console.log('ディレクトリ:', dir);

  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('ディレクトリを作成しました:', dir);
  }

  // 既存のファイルがある場合はバックアップ
  if (fs.existsSync(tokenPath)) {
    const backupPath = `${tokenPath}.backup.${Date.now()}`;
    fs.copyFileSync(tokenPath, backupPath);
    console.log('既存の証明ファイルをバックアップしました:', backupPath);
  }

  // 証明ファイルを書き込み
  const content = JSON.stringify(DEVICE_TOKEN_DATA, null, 2);
  fs.writeFileSync(tokenPath, content, 'utf-8');
  console.log('\n証明ファイルを作成しました！');
  console.log('\n内容:');
  console.log(content);

  console.log('\n✅ 完了！これで「とみた」ユーザーとしてログインできるはずです。');
}

createDeviceTokenFile().catch((err) => {
  console.error('エラーが発生しました:', err);
  process.exit(1);
});


