// データベースから「とみた」ユーザーとデバイストークンを検索するスクリプト

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = 'R:\\learning-management-system\\shared\\learning_management.db';

console.log('データベースファイル:', DB_PATH);

try {
  const db = new Database(DB_PATH);
  
  // 「とみた」ユーザーを検索
  console.log('\n=== 「とみた」ユーザーを検索 ===');
  const users = db.prepare(`
    SELECT sid, username, display_name, email, role, is_active, created_date, last_login
    FROM users
    WHERE LOWER(display_name) LIKE '%とみた%'
       OR LOWER(username) LIKE '%とみた%'
       OR LOWER(email) LIKE '%とみた%'
  `).all() as Array<{
    sid: string;
    username: string;
    display_name: string;
    email: string;
    role: string;
    is_active: number;
    created_date: string;
    last_login: string;
  }>;

  if (users.length === 0) {
    console.log('「とみた」というユーザーが見つかりませんでした。');
  } else {
    console.log(`\n見つかったユーザー数: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`\n--- ユーザー ${index + 1} ---`);
      console.log(`SID (UUID): ${user.sid}`);
      console.log(`ユーザー名: ${user.username}`);
      console.log(`表示名: ${user.display_name}`);
      console.log(`メール: ${user.email}`);
      console.log(`役割: ${user.role}`);
      console.log(`有効: ${user.is_active === 1 ? 'はい' : 'いいえ'}`);
      console.log(`作成日: ${user.created_date}`);
      console.log(`最終ログイン: ${user.last_login}`);
    });
  }

  // 各ユーザーのデバイストークンを検索
  if (users.length > 0) {
    console.log('\n=== デバイストークン情報 ===');
    users.forEach((user) => {
      const tokens = db.prepare(`
        SELECT token, signature, device_label, issued_at, last_used, status, signature_version
        FROM device_tokens
        WHERE user_sid = ?
        ORDER BY issued_at DESC
      `).all(user.sid) as Array<{
        token: string;
        signature: string;
        device_label: string | null;
        issued_at: string;
        last_used: string | null;
        status: string;
        signature_version: number;
      }>;

      console.log(`\nユーザー: ${user.display_name} (${user.sid})`);
      if (tokens.length === 0) {
        console.log('  デバイストークンが見つかりませんでした。');
      } else {
        console.log(`  デバイストークン数: ${tokens.length}`);
        tokens.forEach((token, index) => {
          console.log(`\n  --- トークン ${index + 1} ---`);
          console.log(`  トークン: ${token.token}`);
          console.log(`  署名: ${token.signature}`);
          console.log(`  デバイスラベル: ${token.device_label || '(なし)'}`);
          console.log(`  発行日時: ${token.issued_at}`);
          console.log(`  最終使用: ${token.last_used || '(未使用)'}`);
          console.log(`  ステータス: ${token.status}`);
          console.log(`  署名バージョン: ${token.signature_version}`);
        });
      }
    });
  }

  // すべてのユーザーを一覧表示（参考用）
  console.log('\n\n=== すべてのユーザー一覧（参考） ===');
  const allUsers = db.prepare(`
    SELECT sid, username, display_name, email, role
    FROM users
    ORDER BY created_date DESC
    LIMIT 20
  `).all() as Array<{
    sid: string;
    username: string;
    display_name: string;
    email: string;
    role: string;
  }>;

  console.log(`総ユーザー数（表示上限20件）: ${allUsers.length}`);
  allUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.display_name} (${user.username}) - ${user.sid}`);
  });

  db.close();
} catch (err) {
  console.error('エラーが発生しました:', err);
  process.exit(1);
}


