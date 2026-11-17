import crypto from 'node:crypto';
import { route, getBody, send, error } from '../../lib/http.js';
import { entriesForMonth, currentMonth, isMonth } from '../../lib/data.js';
import { validateEntry, EDITABLE } from '../../lib/validate.js';

// GET  /api/transactions?month=2026-11&kind=expense|income&q=coffee&wallet_id=&limit=50&offset=0
// POST /api/transactions   body: {client_id, kind, amount, currency, category, merchant?, wallet_id, spent_on, note?}
export default route({
  GET: async (req, res, q) => {
    const month = q.month || currentMonth();
    if (!isMonth(month)) return error(res, 400, 'bad_month', 'month must look like 2026-11');
    let items = entriesForMonth(month);
    if (q.kind) items = items.filter((e) => e.kind === q.kind);
    if (q.wallet_id) items = items.filter((e) => e.wallet_id === q.wallet_id);
    if (q.q) {
      const s = q.q.toLowerCase();
      items = items.filter((e) => (e.merchant || '').toLowerCase().includes(s) || (e.note || '').toLowerCase().includes(s));
    }
    const limit = Math.min(Math.max(parseInt(q.limit || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(q.offset || '0', 10) || 0, 0);
    const data = items.slice(offset, offset + limit);
    send(res, 200, { data, month, limit, offset, total: items.length, has_more: offset + limit < items.length });
  },

  POST: async (req, res, q) => {
    const b = await getBody(req);
    if (!b) return error(res, 400, 'bad_json', 'Body must be valid JSON');
    const fields = validateEntry(b);
    if (Object.keys(fields).length) return error(res, 422, 'validation_failed', 'Please fix the highlighted fields', { fields });
    // Same client_id → same id, so a retry never creates a second entry.
    const id = 't_new_' + crypto.createHash('sha256').update(String(b.client_id)).digest('hex').slice(0, 10);
    if (q.simulate === 'duplicate') {
      return error(res, 409, 'duplicate', 'This entry was already saved (same client_id).', { existing_id: id });
    }
    const entry = { id, client_id: b.client_id };
    for (const k of EDITABLE) entry[k] = b[k] ?? null;
    entry.created_at = new Date().toISOString();
    entry.receipt_thumb_url = null;
    entry.receipt_image_url = null;
    send(res, 201, entry);
  },
});
