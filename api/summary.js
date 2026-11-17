import { route, send, error } from '../lib/http.js';
import { entriesForMonth, currentMonth, previousMonth, isMonth, todayStr, CATEGORIES, BUDGETS } from '../lib/data.js';

// GET /api/summary?month=2026-11&wallet_id=
// Home card: per currency {expense, income, previous_month_expense, by_category} + over-budget banner.
function totals(entries) {
  const out = {};
  for (const cur of ['USD', 'KHR']) {
    const rows = entries.filter((e) => e.currency === cur);
    const sum = (list) => list.reduce((s, e) => s + e.amount, 0);
    const byCat = {};
    for (const e of rows) if (e.kind === 'expense') byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    const fix = (n) => (cur === 'KHR' ? Math.round(n) : Math.round(n * 100) / 100);
    out[cur] = {
      expense: fix(sum(rows.filter((e) => e.kind === 'expense'))),
      income: fix(sum(rows.filter((e) => e.kind === 'income'))),
      by_category: Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount: fix(amount) })),
    };
  }
  return out;
}

export default route({
  GET: async (req, res, q) => {
    const month = q.month || currentMonth();
    if (!isMonth(month)) return error(res, 400, 'bad_month', 'month must look like 2026-11');
    const byWallet = (list) => (q.wallet_id ? list.filter((e) => e.wallet_id === q.wallet_id) : list);
    const entries = byWallet(entriesForMonth(month));
    const prev = totals(byWallet(entriesForMonth(previousMonth(month))));
    const cur = totals(entries);
    for (const c of ['USD', 'KHR']) cur[c].previous_month_expense = prev[c].expense;

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const today = todayStr();
    const daysLeft = month === today.slice(0, 7) ? daysInMonth - parseInt(today.slice(8), 10) : 0;

    const budgets = BUDGETS.map((b) => {
      const spent = cur[b.currency].by_category.find((x) => x.category === b.category)?.amount || 0;
      return { ...b, spent, is_over: spent > b.limit };
    });
    send(res, 200, {
      month, days_left: daysLeft, wallet_id: q.wallet_id || null,
      totals: cur,
      over_budget: budgets.filter((b) => b.is_over).sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0] || null,
      updated_at: new Date().toISOString(),
    });
  },
});
