// ネットワークドライブマウントAPI Route

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const MODULE_NAME = 'api/setup/mount';

/**
 * POST /api/setup/mount
 * ネットワークドライブをマウント
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { networkPath, driveLetter } = body;
    console.log(`[Mount] マウントリクエスト受信: networkPath=${networkPath}, driveLetter=${driveLetter}`);

    if (!networkPath || !driveLetter) {
      return NextResponse.json(
        { success: false, error: 'ネットワークパスとドライブレターが必要です' },
        { status: 400 }
      );
    }

    // ネットワークパスの形式チェック
    if (!networkPath.startsWith('\\\\')) {
      return NextResponse.json(
        { success: false, error: 'ネットワークパスはUNCパス形式（\\\\server\\share\\）である必要があります' },
        { status: 400 }
      );
    }

    // ドライブレターの形式チェック
    if (!/^[A-Z]$/.test(driveLetter)) {
      return NextResponse.json(
        { success: false, error: 'ドライブレターはA-Zの1文字である必要があります' },
        { status: 400 }
      );
    }

    // 既にマウントされているか確認
    const drivePath = `${driveLetter}:\\`;
    console.log(`[Mount] ドライブパスの存在確認: ${drivePath}, exists: ${fs.existsSync(drivePath)}`);
    if (fs.existsSync(drivePath)) {
      // 既にマウントされている場合、同じパスか確認
      try {
        // net useコマンドで現在のマウント情報を確認
        console.log(`[Mount] 既存マウント確認コマンド実行: net use ${driveLetter}:`);
        const { stdout } = await execAsync(
          `net use ${driveLetter}:`,
          { encoding: 'utf-8' }
        );
        console.log(`[Mount] 既存マウント確認結果 stdout:`, stdout);
        
        // ネットワークパスを正規化（末尾のバックスラッシュを統一、大文字小文字を無視）
        const normalizedNetworkPath = networkPath.replace(/\\+$/, '').toLowerCase();
        console.log(`[Mount] 正規化されたネットワークパス: ${normalizedNetworkPath}`);
        console.log(`[Mount] stdoutに正規化パスが含まれるか: ${stdout.toLowerCase().includes(normalizedNetworkPath)}`);
        
        // stdoutからネットワークパスを抽出
        if (stdout.toLowerCase().includes(normalizedNetworkPath)) {
          // 既に同じパスがマウントされている
          console.log(`[Mount] 既に同じパスがマウントされています`);
          return NextResponse.json({
            success: true,
            message: '既にマウントされています',
            alreadyMounted: true,
            folderExists: fs.existsSync(`${driveLetter}:\\k_shot`),
          });
        } else {
          // 異なるパスがマウントされている可能性
          // ただし、net useの出力形式が異なる場合があるため、警告のみ
          console.warn(`[Mount] ドライブレター ${driveLetter}: は既に使用されている可能性があります`);
        }
      } catch (err) {
        // 確認に失敗した場合は続行（マウントを試行）
        console.warn('[Mount] 既存マウントの確認に失敗:', err);
      }
    }

    // ネットワークドライブをマウント（net useコマンド）
    // 認証情報は不要（Windows認証を使用）
    const mountCommand = `net use ${driveLetter}: "${networkPath}" /persistent:yes`;
    console.log(`[Mount] マウントコマンド実行: ${mountCommand}`);
    
    try {
      // Shift-JISでエンコーディングを指定（日本語Windowsのデフォルト）
      const { stdout, stderr } = await execAsync(mountCommand, {
        encoding: 'shift_jis',
        timeout: 10000, // 10秒でタイムアウト
      });

      console.log(`[Mount] マウントコマンド実行結果:`);
      console.log(`[Mount] stdout (raw):`, JSON.stringify(stdout));
      console.log(`[Mount] stderr (raw):`, JSON.stringify(stderr));
      console.log(`[Mount] stdout length: ${stdout.length}, stderr length: ${stderr.length}`);

      // マウント成功の判定: ドライブが存在するか確認（最も確実な方法）
      // 少し待ってから確認（マウント処理が完了するまで）
      await new Promise(resolve => setTimeout(resolve, 500));
      const driveExists = fs.existsSync(drivePath);
      console.log(`[Mount] マウント後のドライブ存在確認: ${drivePath}, exists: ${driveExists}`);

      // net useコマンドの出力を確認（補助的な判定）
      const output = (String(stdout) + String(stderr)).toLowerCase();
      console.log(`[Mount] 結合された出力 (lowercase):`, JSON.stringify(output));
      const hasSuccessMessage = output.includes('正常に完了しました') || output.includes('completed successfully');
      console.log(`[Mount] "正常に完了しました" を含むか:`, output.includes('正常に完了しました'));
      console.log(`[Mount] "completed successfully" を含むか:`, output.includes('completed successfully'));
      
      if (driveExists || hasSuccessMessage) {
        // マウント成功
        console.log(`[Mount] マウント成功と判定 (driveExists: ${driveExists}, hasSuccessMessage: ${hasSuccessMessage})`);
      } else {
        console.log(`[Mount] マウント成功の判定に失敗。エラー解析を開始`);
        // エラーメッセージを解析
        if (output.includes('既に使用されています') || output.includes('already in use')) {
          return NextResponse.json(
            { success: false, error: `ドライブレター ${driveLetter}: は既に使用されています` },
            { status: 400 }
          );
        }
        if (output.includes('アクセスが拒否されました') || output.includes('access is denied')) {
          return NextResponse.json(
            { success: false, error: 'ネットワークドライブへのアクセスが拒否されました。権限を確認してください。' },
            { status: 403 }
          );
        }
        if (output.includes('ネットワーク名が見つかりません') || output.includes('network name cannot be found')) {
          return NextResponse.json(
            { success: false, error: 'ネットワークパスが見つかりません。パスを確認してください。' },
            { status: 404 }
          );
        }
        if (output.includes('ユーザー名またはパスワードが正しくありません') || output.includes('incorrect password')) {
          return NextResponse.json(
            { success: false, error: '認証に失敗しました。ネットワークパスと権限を確認してください。' },
            { status: 401 }
          );
        }
        
        console.error(`[Mount] マウント失敗: 認識できないエラー`);
        console.error(`[Mount] stdout:`, JSON.stringify(stdout));
        console.error(`[Mount] stderr:`, JSON.stringify(stderr));
        console.error(`[Mount] output (lowercase):`, JSON.stringify(output));
        return NextResponse.json(
          { success: false, error: `マウントに失敗しました: ${stdout || stderr || '不明なエラー'}` },
          { status: 500 }
        );
      }

      // マウント成功後、フォルダの存在確認
      const targetPath = `${driveLetter}:\\k_shot`;
      console.log(`[Mount] フォルダ存在確認: ${targetPath}`);

      // ナレッジ管理ツール（K_Shot）のフォルダが存在するか確認
      const folderExists = fs.existsSync(targetPath);
      console.log(`[Mount] フォルダ存在: ${folderExists}`);
      
      return NextResponse.json({
        success: true,
        message: 'マウントが完了しました',
        folderExists,
        targetPath,
      });
    } catch (err: any) {
      console.error('[Mount] マウントエラー:', err);
      
      if (err.code === 'ETIMEDOUT') {
        return NextResponse.json(
          { success: false, error: 'マウント処理がタイムアウトしました。ネットワーク接続を確認してください。' },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `マウントに失敗しました: ${err.message || '不明なエラー'}` },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[API] /api/setup/mount POST エラー:', err);
    return NextResponse.json(
      { success: false, error: 'マウント処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

