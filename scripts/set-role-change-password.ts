// 権限変更パスワードを設定するスクリプト

import { hashPassword } from '../src/shared/lib/utils/password';
import { setSystemConfig } from '../src/shared/lib/data-access/system-config';

const MODULE_NAME = 'set-role-change-password';

/**
 * 権限変更パスワードを設定
 * 
 * 使用方法:
 *   tsx scripts/set-role-change-password.ts <権限> <パスワード>
 * 
 * 例:
 *   tsx scripts/set-role-change-password.ts instructor instructor
 *   tsx scripts/set-role-change-password.ts admin admin
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('エラー: 権限とパスワードが指定されていません');
    console.log('使用方法: tsx scripts/set-role-change-password.ts <権限> <パスワード>');
    console.log('  権限: instructor または admin');
    console.log('例:');
    console.log('  tsx scripts/set-role-change-password.ts instructor instructor');
    console.log('  tsx scripts/set-role-change-password.ts admin admin');
    process.exit(1);
  }

  const role = args[0];
  const password = args[1];
  
  if (role !== 'instructor' && role !== 'admin') {
    console.error('エラー: 権限は "instructor" または "admin" である必要があります');
    process.exit(1);
  }
  
  if (password.length < 4) {
    console.error('エラー: パスワードは4文字以上である必要があります');
    process.exit(1);
  }

  try {
    const hashedPassword = hashPassword(password);
    const configKey = `role_change_password_hash_${role}`;
    const success = await setSystemConfig(configKey, hashedPassword);

    if (success) {
      console.log(`✓ ${role === 'instructor' ? '教育者' : '管理者'}の権限変更パスワードを設定しました`);
      console.log(`  ハッシュ値: ${hashedPassword.substring(0, 20)}...`);
    } else {
      console.error(`✗ パスワードの設定に失敗しました`);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
