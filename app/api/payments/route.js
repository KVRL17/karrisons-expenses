import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';
import { buildSettlements } from '@/lib/ledger';
import { createNotification } from '@/lib/helpers';

export async function POST(request) {
  try {
    const body = await request.json();
    const amount = Math.round(Number(body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || body.from === body.to) {
      return NextResponse.json({ error: 'Enter a valid payment.' }, { status: 400 });
    }
    const data = await updateDb((db) => {
      const from = db.profiles.find((person) => person.id === body.from);
      const to = db.profiles.find((person) => person.id === body.to);
      const due = buildSettlements(db.profiles, db.expenses, db.payments).settlements.find((item) => item.from === body.from && item.to === body.to);
      if (!from || !to || !due || Math.round(amount * 100) > Math.round(due.amount * 100)) {
        throw Object.assign(new Error('This settlement has changed. Refresh and try again.'), { status: 409 });
      }
      db.payments.unshift({ id: crypto.randomUUID(), from: from.id, to: to.id, amount, createdAt: new Date().toISOString() });
      db.notifications.unshift(createNotification(`${from.name} paid ${to.name} ₹${amount.toLocaleString('en-IN')}.`, 'success'));
      return db;
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to record payment.' }, { status: error.status || 500 });
  }
}
