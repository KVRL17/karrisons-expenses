import { NextResponse } from 'next/server';
import { pushConfigured } from '@/lib/web-push';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    enabled: pushConfigured(),
    publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : ''
  });
}
