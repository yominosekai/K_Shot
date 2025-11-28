// 共有資料詳細API Routes

import { NextRequest, NextResponse } from 'next/server';
import { handleGet } from './handlers/get';
import { handlePut } from './handlers/put';

/**
 * GET /api/materials/[id]
 * 資料の詳細を取得（閲覧数を自動カウント）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: materialId } = await params;
  return handleGet(request, materialId);
}

/**
 * PUT /api/materials/[id]
 * 資料を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: materialId } = await params;
  return handlePut(request, materialId);
}

