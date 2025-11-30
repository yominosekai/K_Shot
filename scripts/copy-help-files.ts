// ビルド前にヘルプファイルをpublicフォルダにコピーするスクリプト

import fs from 'fs';
import path from 'path';

const sourceDir = path.join(process.cwd(), 'src', 'content', 'help');
const destDir = path.join(process.cwd(), 'public', 'content', 'help');

try {
  // コピー先ディレクトリを作成
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`✅ ディレクトリを作成しました: ${destDir}`);
  }

  // ソースディレクトリが存在するか確認
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ ソースディレクトリが見つかりません: ${sourceDir}`);
    process.exit(1);
  }

  // ファイルをコピー
  const files = fs.readdirSync(sourceDir);
  let copiedCount = 0;

  for (const file of files) {
    // README.mdはコピーしない（public/content/help/README.mdは手動で作成した自動生成警告用）
    if (file === 'README.md') {
      continue;
    }

    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);

    // ファイルのみをコピー（ディレクトリはスキップ）
    const stat = fs.statSync(sourcePath);
    if (stat.isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      copiedCount++;
      console.log(`  → ${file}`);
    }
  }

  console.log(`✅ ヘルプファイルをコピーしました (${copiedCount}ファイル)`);
} catch (error) {
  console.error('❌ ヘルプファイルのコピーに失敗しました:', error);
  process.exit(1);
}
