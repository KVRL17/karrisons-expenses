import { NextResponse } from 'next/server';
import { updateDb, toPublicDb } from '@/lib/db';
import { createNotification } from '@/lib/helpers';

function cleanPhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').slice(0, 16);
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

    let found = false;
    const data = await updateDb((db) => {
      db.profiles = db.profiles.map((profile) => {
        if (profile.id !== id) return profile;
        found = true;
        return {
          ...profile,
          name,
          role: String(body.role || 'Family Member').trim() || 'Family Member',
          color: body.color || profile.color || '#5B5BD6',
          phone: cleanPhone(body.phone),
          whatsappEnabled: Boolean(body.whatsappEnabled),
          updatedAt: new Date().toISOString()
        };
      });
      if (found) db.notifications.unshift(createNotification(`${name}'s notification details were updated.`, 'info'));
      return db;
    });

    if (!found) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    return NextResponse.json({ data: toPublicDb(data) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to update profile.' }, { status: 500 });
  }
}

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
      db.pushSubscriptions = (db.pushSubscriptions || []).filter((item) => item.profileId !== id);
      db.notifications.unshift(createNotification(`${profile.name} was removed from the family.`, 'warning'));
      return db;
    });

    if (blocked) {
      return NextResponse.json({ error: 'This member is linked to expenses or payments. Remove or edit those records first.' }, { status: 409 });
    }
    if (!deletedName) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    return NextResponse.json({ data: toPublicDb(data) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to delete profile.' }, { status: 500 });
  }
}
