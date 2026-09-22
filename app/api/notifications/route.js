import { NextResponse } from 'next/server';
import { updateDb, toPublicDb } from '@/lib/db';

export async function PATCH() {
  try {
    const data = await updateDb(async (db) => {
      db.notifications = db.notifications.map((item) => ({ ...item, read: true }));
      return db;
    });
    return NextResponse.json({ data: toPublicDb(data) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to update notifications.' }, { status: 500 });
  }
}
