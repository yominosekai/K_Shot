// 認証が正しく動作しているかテストするスクリプト

import { readDeviceToken, verifyTokenSignature } from '../src/shared/lib/auth/device-token';
import { getDatabase } from '../src/shared/lib/database/db';
import { getUserData } from '../src/shared/lib/data-access/users';

async function testAuth() {
  console.log('=== 認証テスト開始 ===\n');

  // 1. デバイストークンの読み込み
  console.log('1. デバイストークンの読み込み...');
  const token = readDeviceToken();
  if (!token) {
    console.error('❌ デバイストークンが見つかりません');
    return;
  }
  console.log('✅ デバイストークンを読み込みました');
  console.log('   user_id:', token.user_id);
  console.log('   token:', token.token);
  console.log('   device_label:', token.device_label);

  // 2. 署名検証
  console.log('\n2. 署名検証...');
  const isValid = verifyTokenSignature(token);
  if (!isValid) {
    console.error('❌ 署名検証に失敗しました');
    return;
  }
  console.log('✅ 署名検証成功');

  // 3. データベースでトークンのステータス確認
  console.log('\n3. データベースでトークンのステータス確認...');
  try {
    const db = getDatabase();
    const tokenRecord = db
      .prepare('SELECT status, user_id FROM device_tokens WHERE token = ?')
      .get(token.token) as { status: string; user_id: string } | undefined;

    if (!tokenRecord) {
      console.error('❌ デバイストークンがデータベースに見つかりません');
      console.log('   データベース内のトークンを確認します...');
      const allTokens = db
        .prepare('SELECT token, user_id, status FROM device_tokens LIMIT 5')
        .all() as Array<{ token: string; user_id: string; status: string }>;
      console.log(`   見つかったトークン数: ${allTokens.length}`);
      allTokens.forEach((t, i) => {
        console.log(
          `   ${i + 1}. token: ${t.token.substring(0, 20)}..., user_id: ${t.user_id}, status: ${t.status}`
        );
      });
      return;
    }

    if (tokenRecord.status === 'revoked') {
      console.error('❌ デバイストークンは失効しています');
      return;
    }

    if (tokenRecord.user_id !== token.user_id) {
      console.error('❌ ユーザーIDが一致しません');
      console.log('   トークンファイルのuser_id:', token.user_id);
      console.log('   データベースのuser_id:', tokenRecord.user_id);
      return;
    }

    console.log('✅ トークンのステータス確認成功');
    console.log('   status:', tokenRecord.status);
    console.log('   user_id:', tokenRecord.user_id);
  } catch (err) {
    console.error('❌ データベースアクセスエラー:', err);
    return;
  }

  // 4. ユーザーデータの取得
  console.log('\n4. ユーザーデータの取得...');
  try {
    const user = await getUserData(token.user_id);
    if (!user) {
      console.error('❌ ユーザーが見つかりません');
      console.log('   user_id:', token.user_id);
      return;
    }

    console.log('✅ ユーザーデータを取得しました');
    console.log('   ID:', user.id);
    console.log('   表示名:', user.display_name);
    console.log('   ユーザー名:', user.username);
    console.log('   メール:', user.email);
    console.log('   役割:', user.role);
    console.log('   有効:', user.is_active ? 'はい' : 'いいえ');
  } catch (err) {
    console.error('❌ ユーザーデータ取得エラー:', err);
    return;
  }

  console.log('\n=== 認証テスト完了: すべて成功 ===');
}

testAuth().catch((err) => {
  console.error('エラーが発生しました:', err);
  process.exit(1);
});


