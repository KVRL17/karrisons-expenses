const cents = (value) => Math.round(Number(value) * 100);

export function buildSettlements(profiles, expenses, payments = []) {
  const totals = Object.fromEntries(profiles.map((person) => [person.id, 0]));

  for (const expense of expenses) {
    const members = [...new Set(expense.splitWith || [])].filter((id) => id in totals);
    if (!members.length || !(expense.paidBy in totals)) continue;
    const amount = cents(expense.amount);
    const share = Math.floor(amount / members.length);
    let remainder = amount % members.length;
    totals[expense.paidBy] += amount;
    for (const id of members) totals[id] -= share + (remainder-- > 0 ? 1 : 0);
  }

  for (const payment of payments) {
    if (!(payment.from in totals) || !(payment.to in totals)) continue;
    const amount = cents(payment.amount);
    totals[payment.from] += amount;
    totals[payment.to] -= amount;
  }

  const debtors = Object.entries(totals).filter(([, amount]) => amount < 0).map(([id, amount]) => ({ id, amount: -amount }));
  const creditors = Object.entries(totals).filter(([, amount]) => amount > 0).map(([id, amount]) => ({ id, amount }));
  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: amount / 100 });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (!debtors[i].amount) i++;
    if (!creditors[j].amount) j++;
  }

  return {
    balances: Object.fromEntries(Object.entries(totals).map(([id, amount]) => [id, amount / 100])),
    settlements
  };
}
