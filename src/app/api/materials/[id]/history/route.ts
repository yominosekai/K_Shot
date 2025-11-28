import { NextRequest, NextResponse } from 'next/server';
import { getMaterialRevisions } from '@/shared/lib/data-access/material-revisions';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const materialId = resolvedParams.id;
    if (!materialId) {
      return NextResponse.json({ success: false, error: 'materialId is required' }, { status: 400 });
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 10, 50) : 10;

    const history = await getMaterialRevisions(materialId, limit);
    return NextResponse.json({ success: true, history });
  } catch (err) {
    console.error('GET /api/materials/[id]/history error', err);
    return NextResponse.json(
      { success: false, error: '履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}


