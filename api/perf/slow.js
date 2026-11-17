import { route, send } from '../../lib/http.js';

// GET /api/perf/slow?ms=3000 — answers after `ms` milliseconds (max 8000).
export default route({
  GET: async (req, res, q) => {
    const ms = Math.min(Math.max(parseInt(q.ms || '3000', 10) || 3000, 0), 8000);
    await new Promise((r) => setTimeout(r, ms));
    send(res, 200, { waited_ms: ms });
  },
});
