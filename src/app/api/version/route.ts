import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // package.jsonを読み込む（DBアクセスなし、ファイル読み込みのみ）
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // changelog.jsonを読み込む（静的ファイル、DBアクセスなし）
    let changelog = [];
    try {
      const changelogPath = path.join(process.cwd(), 'public', 'changelog.json');
      if (fs.existsSync(changelogPath)) {
        const changelogData = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
        changelog = changelogData.changelog || [];
      }
    } catch (changelogError) {
      console.warn('changelog.jsonの読み込みに失敗しました:', changelogError);
    }

    // コア技術スタックのみを抽出
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    const coreStack = [
      { name: 'Next.js', version: dependencies.next || 'N/A' },
      { name: 'React', version: dependencies.react || 'N/A' },
      { name: 'TypeScript', version: devDependencies.typescript || 'N/A' },
      { name: 'SQLite (better-sqlite3)', version: dependencies['better-sqlite3'] || 'N/A' },
    ];

    return NextResponse.json({
      success: true,
      info: {
        version: packageJson.version || '0.9.0',
        name: packageJson.name || 'ナレッジ管理ツール（K_Shot）',
        description: packageJson.description || '',
        coreStack,
        changelog,
      },
    });
  } catch (error) {
    console.error('バージョン情報の取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'バージョン情報の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

