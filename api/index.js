import { route, send } from '../lib/http.js';

// GET /api — endpoint list
export default route({
  GET: async (req, res) => send(res, 200, {
    name: 'Merl Luy Practice API',
    version: '1.0.0',
    screens: ['Home', 'Activity', 'Add entry', 'Edit entry'],
    chaos: { delay: 'ms, max 8000', fail: '0..1 chance of HTTP 500', status: 'force a 4xx/5xx' },
    endpoints: [
      'GET /api/summary?month=YYYY-MM&wallet_id=',
      'GET /api/transactions?month=&kind=&q=&wallet_id=&limit=50&offset=0',
      'POST /api/transactions',
      'GET /api/transactions/{id}',
      'PATCH /api/transactions/{id}',
      'DELETE /api/transactions/{id}',
      'GET /api/categories', 'GET /api/wallets', 'GET /api/budgets',
      'GET /api/perf/transactions?count=3000', 'GET /api/perf/slow?ms=3000',
    ],
  }),
});
