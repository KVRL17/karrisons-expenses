import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';
import { createNotification } from '@/lib/helpers';

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    let found = false;
    const data = await updateDb((db) => {
      const payment = db.payments.find((item) => item.id === id);
      if (!payment) return db;
      found = true;
      db.payments = db.payments.filter((item) => item.id !== id);
      db.notifications.unshift(createNotification('A settlement payment was removed.', 'warning'));
      return db;
    });
    if (!found) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to remove payment.' }, { status: 500 });
  }
}
