import { NextResponse } from 'next/server';
import { readDb, toPublicDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(toPublicDb(await readDb()));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to read app data.' }, { status: 503 });
  }
}
