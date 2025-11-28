// プロフィール情報のみ取得する軽量API（last_login更新なし）

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/shared/lib/data-access/users';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = await params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);
    
    // getUserProfileを使用（getUserDataではないので、last_login更新は発生しない）
    const user = await getUserProfile(decodedSid);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // プロフィール情報のみ返す（軽量化）
    return NextResponse.json({
      success: true,
      profile: {
        bio: user.bio,
        skills: user.skills,
        certifications: user.certifications,
        mos: user.mos,
        department_id: user.department_id,
        department: user.department,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('[User Profile GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


