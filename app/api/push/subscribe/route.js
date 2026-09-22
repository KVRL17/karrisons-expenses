import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const endpoint = body.subscription?.endpoint;
    if (!body.profileId || !endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
      return NextResponse.json({ error: 'A family member and valid browser subscription are required.' }, { status: 400 });
    }

    let foundProfile = false;
    await updateDb((db) => {
      foundProfile = db.profiles.some((profile) => profile.id === body.profileId);
      if (!foundProfile) return db;
      db.pushSubscriptions = (db.pushSubscriptions || []).filter((item) => item.subscription?.endpoint !== endpoint);
      db.pushSubscriptions.push({
        id: crypto.randomUUID(),
        profileId: body.profileId,
        subscription: body.subscription,
        createdAt: new Date().toISOString()
      });
      return db;
    });

    if (!foundProfile) return NextResponse.json({ error: 'Family member not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to enable notifications.' }, { status: 500 });
  }
}
