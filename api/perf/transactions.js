import { route, send } from '../../lib/http.js';
import { newestEntries } from '../../lib/data.js';

// GET /api/perf/transactions?count=3000 — the newest `count` entries in ONE response, no paging.
// For the labs: decode on the main thread, render without reuse, then fix it. Max 6000 (~3 MB;
// Vercel limits a response to 4.5 MB).
export default route({
  GET: async (req, res, q) => {
    const count = Math.min(Math.max(parseInt(q.count || '3000', 10) || 3000, 1), 6000);
    const data = newestEntries(count);
    send(res, 200, { count: data.length, data });
  },
});
