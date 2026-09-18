import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await readDb());
  } catch (error) {
    return NextResponse.json({ error: 'Unable to read app data.' }, { status: 500 });
  }
}
