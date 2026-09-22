import { buildSettlements } from '@/lib/ledger';

const cents = (value) => Math.round(Number(value || 0) * 100);
const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(value || 0));

function shareCents(expense, profileId) {
  const members = [...new Set(expense.splitWith || [])];
  const index = members.indexOf(profileId);
  if (index < 0 || !members.length) return 0;
  const total = cents(expense.amount);
  const base = Math.floor(total / members.length);
  const remainder = total % members.length;
  return base + (index < remainder ? 1 : 0);
}

export function buildExpenseSummary(db, expense, profile) {
  const profileMap = Object.fromEntries(db.profiles.map((person) => [person.id, person]));
  const { balances, settlements } = buildSettlements(db.profiles, db.expenses, db.payments || []);

  const currentShare = shareCents(expense, profile.id) / 100;
  const totalPaid = db.expenses
    .filter((item) => item.paidBy === profile.id)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalSplit = db.expenses.reduce((sum, item) => sum + shareCents(item, profile.id) / 100, 0);
  const balance = Number(balances[profile.id] || 0);
  const payer = profileMap[expense.paidBy]?.name || 'Unknown';

  const outgoing = settlements.filter((item) => item.from === profile.id);
  const incoming = settlements.filter((item) => item.to === profile.id);
  const settlementParts = [];
  for (const item of outgoing) {
    settlementParts.push(`You owe ${profileMap[item.to]?.name || 'a family member'} ₹${money(item.amount)}`);
  }
  for (const item of incoming) {
    settlementParts.push(`${profileMap[item.from]?.name || 'A family member'} owes you ₹${money(item.amount)}`);
  }

  let balanceText = 'All settled';
  if (balance < -0.004) balanceText = `You need to pay ₹${money(Math.abs(balance))}`;
  if (balance > 0.004) balanceText = `You should receive ₹${money(balance)}`;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://karri-sons-expenses.vercel.app/';
  const splitLine = currentShare > 0
    ? `Your share in this expense: ₹${money(currentShare)}`
    : 'You are not included in this expense split.';
  const settlementLine = settlementParts.length ? settlementParts.join(' • ') : 'No pending payment between family members.';

  const body = [
    `₹${money(expense.amount)} expense added: ${expense.title}`,
    `Paid by: ${payer}`,
    splitLine,
    `Total paid by you till now: ₹${money(totalPaid)}`,
    `Your total split till now: ₹${money(totalSplit)}`,
    `Balance: ${balanceText}`,
    settlementLine,
    `Check details: ${siteUrl}`
  ].join('\n');

  return {
    profileId: profile.id,
    name: profile.name,
    title: `New expense · ₹${money(expense.amount)}`,
    body,
    url: siteUrl,
    currentShare,
    totalPaid,
    totalSplit,
    balance,
    balanceText,
    settlementLine,
    payer,
    expenseTitle: expense.title,
    expenseAmount: Number(expense.amount || 0)
  };
}
