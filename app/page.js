'use client';

import { useEffect, useMemo, useState } from 'react';

const categories = ['Groceries', 'Bills', 'Dining', 'Travel', 'Shopping', 'Medical', 'Education', 'Other'];
const memberColors = ['#5B5BD6', '#E85AAD', '#1DAA77', '#E28B33', '#3487E8', '#8C62D8', '#DB5F5F'];

const Icons = {
  wallet: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v1H7a3 3 0 0 0 0 6h13v3a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 15.5v-9Z M20 9H7a1 1 0 0 0 0 2h13V9Z" />,
  users: <path d="M16 18v-1.5c0-1.7-1.9-3-4-3s-4 1.3-4 3V18m4-7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5.7 2.5c1.4.5 2.3 1.5 2.3 2.7V18m-3.2-7.6a2.5 2.5 0 0 0 0-4.8" />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3" />,
  bell: <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Zm-8 11h4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  trash: <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" />,
  edit: <path d="m4 16-.7 4 4-.7L18 8.6 14.4 5 4 16Zm8.9-9.5 3.6 3.6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  card: <path d="M3 6h18v12H3V6Zm0 4h18" />,
  chart: <path d="M5 20V10m7 10V4m7 16v-7" />,
  family: <path d="M4 20v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
};

function Icon({ name, size = 20, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Icons[name]}
    </svg>
  );
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function dateLabel(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildSettlements(profiles, expenses) {
  const balances = Object.fromEntries(profiles.map((p) => [p.id, 0]));
  for (const expense of expenses) {
    if (!expense.splitWith?.length) continue;
    const share = Number(expense.amount) / expense.splitWith.length;
    if (balances[expense.paidBy] !== undefined) balances[expense.paidBy] += Number(expense.amount);
    expense.splitWith.forEach((id) => {
      if (balances[id] !== undefined) balances[id] -= share;
    });
  }

  const creditors = Object.entries(balances).filter(([, amount]) => amount > 0.5).map(([id, amount]) => ({ id, amount }));
  const debtors = Object.entries(balances).filter(([, amount]) => amount < -0.5).map(([id, amount]) => ({ id, amount: -amount }));
  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.5) i++;
    if (creditors[j].amount < 0.5) j++;
  }
  return { balances, settlements };
}

const blankExpense = {
  title: '',
  amount: '',
  category: 'Groceries',
  date: new Date().toISOString().slice(0, 10),
  paidBy: '',
  splitWith: [],
  notes: ''
};

export default function Home() {
  const [data, setData] = useState({ profiles: [], expenses: [], notifications: [] });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [expenseModal, setExpenseModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(blankExpense);
  const [editingId, setEditingId] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', role: 'Family Member', color: memberColors[0] });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load data.');
      setData(json);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(''), 3200);
  }

  const profileMap = useMemo(() => Object.fromEntries(data.profiles.map((p) => [p.id, p])), [data.profiles]);
  const { balances, settlements } = useMemo(() => buildSettlements(data.profiles, data.expenses), [data]);

  const totals = useMemo(() => {
    const total = data.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthKey = new Date().toISOString().slice(0, 7);
    const thisMonth = data.expenses.filter((e) => e.date?.startsWith(monthKey)).reduce((sum, e) => sum + Number(e.amount), 0);
    const biggest = data.expenses.reduce((max, e) => Math.max(max, Number(e.amount)), 0);
    return { total, thisMonth, biggest };
  }, [data.expenses]);

  const categoryTotals = useMemo(() => {
    const totalsByCategory = {};
    data.expenses.forEach((expense) => {
      totalsByCategory[expense.category] = (totalsByCategory[expense.category] || 0) + Number(expense.amount);
    });
    return Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
  }, [data.expenses]);

  const filteredExpenses = useMemo(() => data.expenses.filter((expense) => {
    const matchesText = expense.title.toLowerCase().includes(search.toLowerCase()) || expense.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
    return matchesText && matchesCategory;
  }), [data.expenses, search, categoryFilter]);

  const unread = data.notifications.filter((n) => !n.read).length;

  function openAddExpense() {
    const ids = data.profiles.map((p) => p.id);
    setEditingId(null);
    setExpenseForm({ ...blankExpense, paidBy: ids[0] || '', splitWith: ids });
    setExpenseModal(true);
  }

  function openEditExpense(expense) {
    setEditingId(expense.id);
    setExpenseForm({ ...expense, amount: String(expense.amount) });
    setExpenseModal(true);
  }

  function toggleSplitMember(id) {
    setExpenseForm((current) => ({
      ...current,
      splitWith: current.splitWith.includes(id) ? current.splitWith.filter((item) => item !== id) : [...current.splitWith, id]
    }));
  }

  async function saveExpense(event) {
    event.preventDefault();
    if (!expenseForm.splitWith.length) return showToast('Select at least one person for the split.');
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/expenses/${editingId}` : '/api/expenses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to save expense.');
      setData(json.data);
      setExpenseModal(false);
      showToast(editingId ? 'Expense updated successfully.' : 'Expense added successfully.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to delete expense.');
      setData(json.data);
      showToast('Expense deleted.');
    } catch (error) { showToast(error.message); }
  }

  async function saveMember(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to add member.');
      setData(json.data);
      setMemberModal(false);
      setMemberForm({ name: '', role: 'Family Member', color: memberColors[(data.profiles.length + 1) % memberColors.length] });
      showToast('Family member added.');
    } catch (error) { showToast(error.message); }
    finally { setSaving(false); }
  }

  async function deleteMember(id) {
    if (!window.confirm('Remove this family member?')) return;
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to remove member.');
      setData(json.data);
      showToast('Family member removed.');
    } catch (error) { showToast(error.message); }
  }

  async function markNotificationsRead() {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch { /* no-op */ }
  }

  if (loading) {
    return <div className="loadingScreen"><div className="loader" /><p>Preparing your family dashboard…</p></div>;
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Icon name="wallet" size={24} /></div>
          <div><strong>Expense & Split</strong><span>Karri Sons</span></div>
        </div>

        <nav className="navGroup">
          <button className={activeView === 'overview' ? 'navItem active' : 'navItem'} onClick={() => setActiveView('overview')}><Icon name="chart" /> Overview</button>
          <button className={activeView === 'expenses' ? 'navItem active' : 'navItem'} onClick={() => setActiveView('expenses')}><Icon name="receipt" /> Expenses</button>
          <button className={activeView === 'members' ? 'navItem active' : 'navItem'} onClick={() => setActiveView('members')}><Icon name="users" /> Family members</button>
        </nav>

        <div className="familyCard">
          <div className="miniIcon"><Icon name="family" /></div>
          <strong>Karri Sons</strong>
          <span>{data.profiles.length} family members</span>
          <div className="avatarStack">
            {data.profiles.slice(0, 4).map((p) => <div key={p.id} className="stackAvatar" style={{ background: p.color }}>{initials(p.name)}</div>)}
          </div>
        </div>
        <div className="sidebarFoot">Private family tracker<br /><span>JSON data storage</span></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FAMILY FINANCES</p>
            <h1>{activeView === 'overview' ? 'Good to see you 👋' : activeView === 'expenses' ? 'All expenses' : 'Family members'}</h1>
            <p className="subtitle">{activeView === 'overview' ? 'Everything your family spent and split, in one clean place.' : activeView === 'expenses' ? 'Review, edit, search and manage every family expense.' : 'Add or remove people included in your family splits.'}</p>
          </div>
          <div className="topActions">
            <div className="notificationWrap">
              <button className="iconButton" onClick={() => { setNotificationOpen((v) => !v); if (!notificationOpen) markNotificationsRead(); }} aria-label="Notifications">
                <Icon name="bell" />{unread > 0 && <span className="notificationDot">{unread}</span>}
              </button>
              {notificationOpen && (
                <div className="notificationPanel">
                  <div className="panelHead"><div><strong>Notifications</strong><span>Recent family activity</span></div><span className="statusPill">{data.notifications.length}</span></div>
                  <div className="notificationList">
                    {data.notifications.length ? data.notifications.slice(0, 8).map((n) => (
                      <div className="notificationItem" key={n.id}>
                        <span className={`notifIcon ${n.type}`}><Icon name={n.type === 'warning' ? 'trash' : 'check'} size={15} /></span>
                        <div><p>{n.message}</p><span>{relativeTime(n.createdAt)}</span></div>
                      </div>
                    )) : <div className="emptyMini">No notifications yet.</div>}
                  </div>
                </div>
              )}
            </div>
            <button className="primaryButton" onClick={openAddExpense}><Icon name="plus" size={18} /> Add expense</button>
          </div>
        </header>

        {activeView === 'overview' && (
          <>
            <div className="statsGrid">
              <StatCard icon="wallet" label="Total family spend" value={currency(totals.total)} note={`${data.expenses.length} expenses recorded`} />
              <StatCard icon="card" label="This month" value={currency(totals.thisMonth)} note="Current month spending" />
              <StatCard icon="users" label="Family members" value={data.profiles.length} note="Included in your splits" />
              <StatCard icon="receipt" label="Largest expense" value={currency(totals.biggest)} note="Biggest single transaction" />
            </div>

            <div className="dashboardGrid">
              <section className="panel spendingPanel">
                <div className="sectionHead"><div><p className="eyebrow">SPENDING MIX</p><h2>Where the money went</h2></div><span className="softBadge">All time</span></div>
                <div className="categoryList">
                  {categoryTotals.length ? categoryTotals.slice(0, 6).map(([category, amount]) => {
                    const pct = totals.total ? Math.round((amount / totals.total) * 100) : 0;
                    return <div className="categoryRow" key={category}>
                      <div className="categoryLine"><span>{category}</span><strong>{currency(amount)}</strong></div>
                      <div className="progressTrack"><div className="progressValue" style={{ width: `${pct}%` }} /></div>
                      <span className="percentLabel">{pct}%</span>
                    </div>;
                  }) : <Empty text="Add an expense to see category insights." />}
                </div>
              </section>

              <section className="panel balancePanel">
                <div className="sectionHead"><div><p className="eyebrow">SETTLE UP</p><h2>Who owes whom</h2></div><span className="softBadge">Auto calculated</span></div>
                <div className="settlementList">
                  {settlements.length ? settlements.slice(0, 5).map((item, index) => {
                    const from = profileMap[item.from]; const to = profileMap[item.to];
                    return <div className="settlement" key={`${item.from}-${item.to}-${index}`}>
                      <Avatar profile={from} /><div className="settlementText"><strong>{from?.name}</strong><span>owes</span></div>
                      <div className="settlementAmount">{currency(item.amount)}</div><Icon name="arrow" size={17} />
                      <Avatar profile={to} /><strong className="toName">{to?.name}</strong>
                    </div>;
                  }) : <div className="balancedState"><span><Icon name="check" /></span><strong>All balanced</strong><p>No pending family settlements right now.</p></div>}
                </div>
              </section>
            </div>

            <section className="panel recentPanel">
              <div className="sectionHead"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent expenses</h2></div><button className="textButton" onClick={() => setActiveView('expenses')}>View all <Icon name="arrow" size={16} /></button></div>
              <ExpenseTable expenses={data.expenses.slice(0, 6)} profiles={profileMap} onEdit={openEditExpense} onDelete={deleteExpense} />
            </section>
          </>
        )}

        {activeView === 'expenses' && (
          <section className="panel pagePanel">
            <div className="toolRow">
              <div className="searchBox"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…" /></div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filterSelect"><option>All</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
              <span className="resultCount">{filteredExpenses.length} result{filteredExpenses.length !== 1 ? 's' : ''}</span>
            </div>
            <ExpenseTable expenses={filteredExpenses} profiles={profileMap} onEdit={openEditExpense} onDelete={deleteExpense} detailed />
          </section>
        )}

        {activeView === 'members' && (
          <>
            <div className="memberPageHead"><div><strong>{data.profiles.length} people</strong><span>Manage everyone included in family expenses.</span></div><button className="secondaryButton" onClick={() => setMemberModal(true)}><Icon name="plus" size={17} /> Add family member</button></div>
            <div className="memberGrid">
              {data.profiles.map((profile) => {
                const paid = data.expenses.filter((e) => e.paidBy === profile.id).reduce((sum, e) => sum + Number(e.amount), 0);
                const balance = balances[profile.id] || 0;
                return <article className="memberCard" key={profile.id}>
                  <div className="memberCardTop"><Avatar profile={profile} large /><button className="smallIconButton" onClick={() => deleteMember(profile.id)} title="Delete member"><Icon name="trash" size={17} /></button></div>
                  <h3>{profile.name}</h3><p>{profile.role}</p>
                  <div className="memberMetrics"><div><span>Total paid</span><strong>{currency(paid)}</strong></div><div><span>Net balance</span><strong className={balance >= 0 ? 'positive' : 'negative'}>{balance >= 0 ? '+' : ''}{currency(balance)}</strong></div></div>
                </article>;
              })}
              <button className="addMemberCard" onClick={() => setMemberModal(true)}><span><Icon name="plus" /></span><strong>Add family member</strong><p>Create another profile for splitting.</p></button>
            </div>
          </>
        )}
      </section>

      {expenseModal && (
        <Modal title={editingId ? 'Edit expense' : 'Add a new expense'} subtitle="Enter the details and choose who should share this cost." onClose={() => setExpenseModal(false)}>
          <form onSubmit={saveExpense}>
            <div className="formGrid two">
              <Field label="Expense title"><input required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. Monthly groceries" /></Field>
              <Field label="Amount"><div className="moneyInput"><span>₹</span><input required type="number" min="1" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0" /></div></Field>
              <Field label="Category"><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Date"><input required type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} /></Field>
            </div>
            <Field label="Paid by"><select required value={expenseForm.paidBy} onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}>{data.profiles.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Split equally with"><div className="memberChecks">{data.profiles.map((p) => <button type="button" key={p.id} className={expenseForm.splitWith.includes(p.id) ? 'memberCheck selected' : 'memberCheck'} onClick={() => toggleSplitMember(p.id)}><Avatar profile={p} /><span>{p.name}</span><span className="checkMark">{expenseForm.splitWith.includes(p.id) && <Icon name="check" size={13} />}</span></button>)}</div></Field>
            {Number(expenseForm.amount) > 0 && expenseForm.splitWith.length > 0 && <div className="splitPreview"><span>Each person&apos;s share</span><strong>{currency(Number(expenseForm.amount) / expenseForm.splitWith.length)}</strong><small>Split equally between {expenseForm.splitWith.length} {expenseForm.splitWith.length === 1 ? 'person' : 'people'}</small></div>}
            <Field label="Notes (optional)"><textarea rows="3" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} placeholder="Add a note about this expense…" /></Field>
            <div className="modalActions"><button type="button" className="ghostButton" onClick={() => setExpenseModal(false)}>Cancel</button><button disabled={saving} className="primaryButton" type="submit">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add expense'}</button></div>
          </form>
        </Modal>
      )}

      {memberModal && (
        <Modal title="Add family member" subtitle="Create a profile so this person can be included in splits." onClose={() => setMemberModal(false)} small>
          <form onSubmit={saveMember}>
            <Field label="Full name"><input required value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Enter family member name" /></Field>
            <Field label="Role"><select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}><option>Family Member</option><option>Family Admin</option><option>Parent</option><option>Son</option><option>Daughter</option></select></Field>
            <Field label="Profile color"><div className="colorChoices">{memberColors.map((color) => <button type="button" aria-label={`Choose ${color}`} key={color} onClick={() => setMemberForm({ ...memberForm, color })} className={memberForm.color === color ? 'color active' : 'color'} style={{ background: color }}>{memberForm.color === color && <Icon name="check" size={14} />}</button>)}</div></Field>
            <div className="modalActions"><button type="button" className="ghostButton" onClick={() => setMemberModal(false)}>Cancel</button><button disabled={saving} className="primaryButton" type="submit">{saving ? 'Adding…' : 'Add member'}</button></div>
          </form>
        </Modal>
      )}

      {toast && <div className="toast"><Icon name="check" size={18} /><span>{toast}</span></div>}
    </main>
  );
}

function StatCard({ icon, label, value, note }) {
  return <article className="statCard"><div className="statIcon"><Icon name={icon} /></div><div className="statContent"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function Avatar({ profile, large = false }) {
  if (!profile) return <span className={large ? 'avatar large' : 'avatar'}>?</span>;
  return <span className={large ? 'avatar large' : 'avatar'} style={{ background: profile.color }}>{initials(profile.name)}</span>;
}

function ExpenseTable({ expenses, profiles, onEdit, onDelete, detailed = false }) {
  if (!expenses.length) return <Empty text="No expenses found. Add one to get started." />;
  return <div className="tableWrap"><table><thead><tr><th>Expense</th><th>Category</th><th>Paid by</th>{detailed && <th>Split with</th>}<th>Date</th><th className="alignRight">Amount</th><th /></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td><div className="expenseName"><span className={`categoryIcon cat-${expense.category.toLowerCase()}`}>{expense.category.slice(0, 1)}</span><div><strong>{expense.title}</strong><small>{expense.notes || 'No note'}</small></div></div></td><td><span className="categoryTag">{expense.category}</span></td><td><div className="paidBy"><Avatar profile={profiles[expense.paidBy]} /><span>{profiles[expense.paidBy]?.name || 'Unknown'}</span></div></td>{detailed && <td><div className="miniAvatars">{expense.splitWith.slice(0, 4).map((id) => <Avatar key={id} profile={profiles[id]} />)}{expense.splitWith.length > 4 && <span className="moreAvatar">+{expense.splitWith.length - 4}</span>}</div></td>}<td><span className="mutedCell">{dateLabel(expense.date)}</span></td><td className="alignRight amountCell">{currency(expense.amount)}</td><td><div className="rowActions"><button title="Edit" onClick={() => onEdit(expense)}><Icon name="edit" size={16} /></button><button title="Delete" onClick={() => onDelete(expense.id)}><Icon name="trash" size={16} /></button></div></td></tr>)}</tbody></table></div>;
}

function Modal({ title, subtitle, onClose, children, small = false }) {
  return <div className="modalBackdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={small ? 'modal small' : 'modal'}><div className="modalHeader"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="modalClose" onClick={onClose}><Icon name="close" /></button></div>{children}</div></div>;
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Empty({ text }) { return <div className="emptyState"><span><Icon name="receipt" /></span><p>{text}</p></div>; }
