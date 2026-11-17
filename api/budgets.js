import { route, send } from '../lib/http.js';
import { entriesForMonth, currentMonth, BUDGETS } from '../lib/data.js';

// GET /api/budgets — this month's budgets with how much was spent.
export default route({
  GET: async (req, res) => {
    const entries = entriesForMonth(currentMonth()).filter((e) => e.kind === 'expense');
    const data = BUDGETS.map((b) => {
      let spent = entries.filter((e) => e.category === b.category && e.currency === b.currency).reduce((s, e) => s + e.amount, 0);
      spent = b.currency === 'KHR' ? Math.round(spent) : Math.round(spent * 100) / 100;
      return { ...b, spent, is_over: spent > b.limit };
    });
    send(res, 200, { data, month: currentMonth() });
  },
});
