import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const endpoint = body.endpoint;
    if (!endpoint) return NextResponse.json({ error: 'Subscription endpoint is required.' }, { status: 400 });
    await updateDb((db) => {
      db.pushSubscriptions = (db.pushSubscriptions || []).filter((item) => item.subscription?.endpoint !== endpoint);
      return db;
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to disable notifications.' }, { status: 500 });
  }
}
