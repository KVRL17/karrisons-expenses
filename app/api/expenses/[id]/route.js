import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/db';
import { createNotification } from '@/lib/helpers';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const amount = Number(body.amount);
    if (!body.title?.trim() || !amount || amount <= 0 || !body.paidBy || !body.splitWith?.length) {
      return NextResponse.json({ error: 'Title, amount, payer and split members are required.' }, { status: 400 });
    }

    let found = false;
    const data = await updateDb(async (db) => {
      db.expenses = db.expenses.map((expense) => {
        if (expense.id !== id) return expense;
        found = true;
        return {
          ...expense,
          title: body.title.trim(),
          amount,
          category: body.category || 'Other',
          date: body.date,
          paidBy: body.paidBy,
          splitWith: body.splitWith,
          notes: String(body.notes || '').trim(),
          updatedAt: new Date().toISOString()
        };
      });
      if (found) db.notifications.unshift(createNotification(`Expense updated: ${body.title.trim()}.`, 'info'));
      return db;
    });

    if (!found) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Unable to update expense.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    let deletedTitle = '';
    const data = await updateDb(async (db) => {
      const expense = db.expenses.find((item) => item.id === id);
      if (!expense) return db;
      deletedTitle = expense.title;
      db.expenses = db.expenses.filter((item) => item.id !== id);
      db.notifications.unshift(createNotification(`Expense deleted: ${expense.title}.`, 'warning'));
      return db;
    });
    if (!deletedTitle) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Unable to delete expense.' }, { status: 500 });
  }
}
