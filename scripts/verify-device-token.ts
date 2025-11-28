// 作成した証明ファイルの署名を検証するスクリプト

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const TOKEN_FILE_NAME = 'device-token.json';

function resolveDefaultTokenDir(): string {
  if (process.env.LMS_DEVICE_TOKEN_DIR) {
    return process.env.LMS_DEVICE_TOKEN_DIR;
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'k-shot', 'credentials');
  }

  return path.join(os.homedir(), '.k-shot', 'credentials');
}

function getDeviceTokenFilePath(): string {
  if (process.env.LMS_DEVICE_TOKEN_FILE) {
    return process.env.LMS_DEVICE_TOKEN_FILE;
  }

  const defaultDir = resolveDefaultTokenDir();
  return path.join(defaultDir, TOKEN_FILE_NAME);
}

function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET_KEY;
  if (!secret) {
    return 'development-token-secret';
  }
  return secret;
}

function signToken(payload: {
  token: string;
  userSid: string;
  issuedAt: string;
  deviceLabel?: string;
}): string {
  const secret = getTokenSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${payload.token}:${payload.userSid}:${payload.issuedAt}:${payload.deviceLabel || ''}`);
  return hmac.digest('hex');
}

function verifyTokenSignature(tokenFile: {
  token: string;
  user_sid: string;
  issued_at: string;
  device_label?: string;
  signature: string;
}): boolean {
  try {
    const expected = signToken({
      token: tokenFile.token,
      userSid: tokenFile.user_sid,
      issuedAt: tokenFile.issued_at,
      deviceLabel: tokenFile.device_label,
    });
    return expected === tokenFile.signature;
  } catch (err) {
    console.error('署名検証中にエラーが発生しました:', err);
    return false;
  }
}

async function verifyDeviceToken() {
  const tokenPath = getDeviceTokenFilePath();
  console.log('証明ファイルのパス:', tokenPath);

  if (!fs.existsSync(tokenPath)) {
    console.error('証明ファイルが見つかりませんでした:', tokenPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(tokenPath, 'utf-8');
  const tokenFile = JSON.parse(raw);

  console.log('\n証明ファイルの内容:');
  console.log(JSON.stringify(tokenFile, null, 2));

  console.log('\n署名検証中...');
  const isValid = verifyTokenSignature(tokenFile);

  if (isValid) {
    console.log('✅ 署名検証成功！証明ファイルは有効です。');
  } else {
    console.log('❌ 署名検証失敗！証明ファイルの署名が正しくありません。');
    console.log('\n期待される署名を計算中...');
    const expectedSignature = signToken({
      token: tokenFile.token,
      userSid: tokenFile.user_sid,
      issuedAt: tokenFile.issued_at,
      deviceLabel: tokenFile.device_label,
    });
    console.log('現在の署名:', tokenFile.signature);
    console.log('期待される署名:', expectedSignature);
  }
}

verifyDeviceToken().catch((err) => {
  console.error('エラーが発生しました:', err);
  process.exit(1);
});


