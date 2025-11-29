// デバイストークン（証明ファイル）ユーティリティ

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { debug, error } from '../logger';

const MODULE_NAME = 'device-token';
const TOKEN_FILE_NAME = 'device-token.json';
let hasWarnedSecret = false;

export interface DeviceTokenFile {
  schema_version: string;
  token: string;
  signature: string;
  user_id: string;
  issued_at: string;
  device_label?: string;
  signature_version?: number;
}

function resolveDefaultTokenDir(): string {
  if (process.env.LMS_DEVICE_TOKEN_DIR) {
    return process.env.LMS_DEVICE_TOKEN_DIR;
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'k-shot', 'credentials');
  }

  return path.join(os.homedir(), '.k-shot', 'credentials');
}

export function getDeviceTokenFilePath(): string {
  if (process.env.LMS_DEVICE_TOKEN_FILE) {
    return process.env.LMS_DEVICE_TOKEN_FILE;
  }

  const defaultDir = resolveDefaultTokenDir();
  return path.join(defaultDir, TOKEN_FILE_NAME);
}

function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET_KEY;
  if (!secret) {
    if (!hasWarnedSecret) {
      debug(MODULE_NAME, 'TOKEN_SECRET_KEYが設定されていません。開発用の固定シークレットを使用します。');
      hasWarnedSecret = true;
    }
    return 'development-token-secret';
  }
  return secret;
}

export function signToken(payload: {
  token: string;
  userId: string;
  issuedAt: string;
  deviceLabel?: string;
}): string {
  const secret = getTokenSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${payload.token}:${payload.userId}:${payload.issuedAt}:${payload.deviceLabel || ''}`);
  return hmac.digest('hex');
}

export function verifyTokenSignature(tokenFile: DeviceTokenFile): boolean {
  try {
    const expected = signToken({
      token: tokenFile.token,
      userId: tokenFile.user_id,
      issuedAt: tokenFile.issued_at,
      deviceLabel: tokenFile.device_label,
    });
    return expected === tokenFile.signature;
  } catch (err) {
    error(MODULE_NAME, '署名検証中にエラーが発生しました', err);
    return false;
  }
}

export function readDeviceToken(): DeviceTokenFile | null {
  const tokenPath = getDeviceTokenFilePath();

  try {
    if (!fs.existsSync(tokenPath)) {
      return null;
    }
    const raw = fs.readFileSync(tokenPath, 'utf-8');
    const parsed = JSON.parse(raw) as DeviceTokenFile;
    return parsed;
  } catch (err) {
    error(MODULE_NAME, 'デバイストークンの読み込みに失敗しました', err);
    return null;
  }
}

export async function writeDeviceToken(payload: DeviceTokenFile): Promise<void> {
  const tokenPathEnv = process.env.LMS_DEVICE_TOKEN_FILE;
  const tokenPath = tokenPathEnv || path.join(resolveDefaultTokenDir(), TOKEN_FILE_NAME);
  const dir = path.dirname(tokenPath);

  await fs.promises.mkdir(dir, { recursive: true }).catch((err) => {
    error(MODULE_NAME, 'デバイストークンディレクトリの作成に失敗しました', err);
    throw err;
  });

  const content = JSON.stringify(payload, null, 2);
  await fs.promises.writeFile(tokenPath, content, 'utf-8');
  debug(MODULE_NAME, `デバイストークンを書き込みました: ${tokenPath}`);
}

