import { NextRequest, NextResponse } from 'next/server';
import { updateUserData } from '@/shared/lib/data-access/users';
import { requireOwnerOrAdmin } from '@/shared/lib/auth/middleware';
import { info, error, debug } from '@/shared/lib/logger';
import { saveAvatar, deleteAvatar } from '@/shared/lib/file-system/avatar';
import { invalidateAvatarCache } from '@/shared/lib/cache/avatar-cache';

const MODULE_NAME = 'api/profile/update';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    
    if (!userId) {
      error(MODULE_NAME, 'プロフィール更新エラー: userIdが指定されていません');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 認証・認可チェック（本人のみ更新可能、管理者は全員更新可能）
    const authResult = await requireOwnerOrAdmin(userId);
    if (!authResult.success) {
      return authResult.response;
    }

    // テキストフィールドを取得
    const updateData: any = {
      display_name: formData.get('display_name') as string | null,
      email: formData.get('email') as string | null,
      bio: formData.get('bio') as string | null,
      department: formData.get('department') as string | null,
    };

    // スキル、資格、職場内資格を取得（JSON文字列として送信される想定）
    const skillsStr = formData.get('skills') as string | null;
    const certificationsStr = formData.get('certifications') as string | null;
    const mosStr = formData.get('mos') as string | null;

    if (skillsStr) {
      try {
        updateData.skills = JSON.parse(skillsStr);
      } catch {
        updateData.skills = [];
      }
    }

    if (certificationsStr) {
      try {
        updateData.certifications = JSON.parse(certificationsStr);
      } catch {
        updateData.certifications = [];
      }
    }

    if (mosStr) {
      try {
        updateData.mos = JSON.parse(mosStr);
      } catch {
        updateData.mos = [];
      }
    }

    // アバター画像の処理
    const avatarFile = formData.get('avatar') as File | null;
    let avatarUpdated = false;
    if (avatarFile && avatarFile.size > 0) {
      // ファイルがアップロードされた場合
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const avatarPath = await saveAvatar(userId, buffer);
      updateData.avatar = avatarPath;
      avatarUpdated = true;
    } else if (formData.get('avatar') === '') {
      // 空文字列が送信された場合はアバター削除
      await deleteAvatar(userId);
      updateData.avatar = '';
      avatarUpdated = true;
    }

    debug(MODULE_NAME, 'プロフィール更新リクエスト受信', {
      userId,
      updateFields: Object.keys(updateData),
      hasAvatarFile: !!avatarFile,
    });

    const result = await updateUserData(userId, updateData);

    if (result) {
      // アバターが更新された場合はサーバー側キャッシュを無効化
      if (avatarUpdated) {
        invalidateAvatarCache(userId);
        debug(MODULE_NAME, 'アバター更新によりサーバー側キャッシュを無効化', { userId });
      }

      info(MODULE_NAME, 'プロフィール更新成功', {
        userId,
        hasAvatar: !!result.avatar,
        avatarPath: result.avatar,
      });
      return NextResponse.json({ success: true, user: result });
    } else {
      error(MODULE_NAME, 'プロフィール更新失敗: updateUserDataがnullを返しました', {
        userId,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  } catch (err) {
    error(MODULE_NAME, 'プロフィール更新エラー:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

