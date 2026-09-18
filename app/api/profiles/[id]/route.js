import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';
import { createNotification } from '@/lib/helpers';

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    let deletedName = '';
    let blocked = false;

    const data = await updateDb(async (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      if (!profile) return db;
      const used = db.expenses.some((expense) => expense.paidBy === id || expense.splitWith.includes(id)) || db.payments.some((payment) => payment.from === id || payment.to === id);
      if (used) {
        blocked = true;
        return db;
      }
      deletedName = profile.name;
      db.profiles = db.profiles.filter((item) => item.id !== id);
      db.notifications.unshift(createNotification(`${profile.name} was removed from the family.`, 'warning'));
      return db;
    });

    if (blocked) {
      return NextResponse.json({ error: 'This member is linked to expenses or payments. Remove or edit those records first.' }, { status: 409 });
    }
    if (!deletedName) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to delete profile.' }, { status: 500 });
  }
}
