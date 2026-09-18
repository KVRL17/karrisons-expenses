import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';
import { createNotification } from '@/lib/helpers';

export async function POST(request) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    if (!body.title?.trim() || !amount || amount <= 0 || !body.paidBy || !body.splitWith?.length) {
      return NextResponse.json({ error: 'Title, amount, payer and split members are required.' }, { status: 400 });
    }

    let expense;
    const data = await updateDb(async (db) => {
      expense = {
        id: crypto.randomUUID(),
        title: body.title.trim(),
        amount,
        category: body.category || 'Other',
        date: body.date || new Date().toISOString().slice(0, 10),
        paidBy: body.paidBy,
        splitWith: body.splitWith,
        notes: String(body.notes || '').trim(),
        createdAt: new Date().toISOString()
      };
      db.expenses.unshift(expense);
      db.notifications.unshift(createNotification(`₹${amount.toLocaleString('en-IN')} expense added: ${expense.title}.`, 'success'));
      return db;
    });

    return NextResponse.json({ expense, data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to add expense.' }, { status: 500 });
  }
}
