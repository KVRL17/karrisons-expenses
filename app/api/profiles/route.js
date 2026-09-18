import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';
import { createNotification } from '@/lib/helpers';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

    let created;
    const data = await updateDb(async (db) => {
      created = {
        id: crypto.randomUUID(),
        name,
        role: String(body.role || 'Family Member').trim() || 'Family Member',
        color: body.color || '#5B5BD6',
        createdAt: new Date().toISOString()
      };
      db.profiles.push(created);
      db.notifications.unshift(createNotification(`${name} was added to the family.`, 'success'));
      return db;
    });

    return NextResponse.json({ profile: created, data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to add profile.' }, { status: 500 });
  }
}
