import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';

export async function PATCH() {
  try {
    const data = await updateDb(async (db) => {
      db.notifications = db.notifications.map((item) => ({ ...item, read: true }));
      return db;
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Unable to update notifications.' }, { status: 500 });
  }
}
