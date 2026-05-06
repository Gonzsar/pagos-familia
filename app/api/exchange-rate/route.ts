import { NextResponse } from 'next/server';
import { getUyuPerUsd } from '@/lib/exchange-rate';

export async function GET() {
  const rate = await getUyuPerUsd();
  return NextResponse.json({ uyuPerUsd: rate });
}
