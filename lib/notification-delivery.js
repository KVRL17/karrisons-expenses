import { buildExpenseSummary } from '@/lib/expense-notifications';
import { sendWebPush } from '@/lib/web-push';
import { sendWhatsAppExpense } from '@/lib/whatsapp';
import { updateDb } from '@/lib/db';

export async function deliverExpenseNotifications(db, expense) {
  const subscriptions = Array.isArray(db.pushSubscriptions) ? db.pushSubscriptions : [];
  const staleEndpoints = new Set();
  const results = [];

  for (const profile of db.profiles) {
    const summary = buildExpenseSummary(db, expense, profile);
    const profileSubscriptions = subscriptions.filter((item) => item.profileId === profile.id);

    for (const item of profileSubscriptions) {
      try {
        const result = await sendWebPush(item.subscription, {
          title: summary.title,
          body: summary.body,
          url: summary.url,
          tag: `expense-${expense.id}`
        });
        results.push({ channel: 'push', profileId: profile.id, ...result });
      } catch (error) {
        const status = Number(error.status || 0);
        if (status === 404 || status === 410) staleEndpoints.add(item.subscription?.endpoint);
        results.push({ channel: 'push', profileId: profile.id, ok: false, error: error.message });
      }
    }

    try {
      const result = await sendWhatsAppExpense(profile, summary);
      results.push({ channel: 'whatsapp', profileId: profile.id, ...result });
    } catch (error) {
      results.push({ channel: 'whatsapp', profileId: profile.id, ok: false, error: error.message });
    }
  }

  if (staleEndpoints.size) {
    try {
      await updateDb((current) => {
        current.pushSubscriptions = (current.pushSubscriptions || []).filter((item) => !staleEndpoints.has(item.subscription?.endpoint));
        return current;
      });
    } catch {
      // Stale-subscription cleanup must never undo a saved expense.
    }
  }

  return {
    pushSent: results.filter((item) => item.channel === 'push' && item.ok).length,
    whatsappSent: results.filter((item) => item.channel === 'whatsapp' && item.ok).length,
    results
  };
}
