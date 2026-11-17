import { route, getBody, send, error, getQuery } from '../../lib/http.js';
import { findEntry } from '../../lib/data.js';
import { validateEntry, EDITABLE } from '../../lib/validate.js';

// GET    /api/transactions/t_20261117_02
// PATCH  /api/transactions/t_20261117_02   body: only the changed fields
// DELETE /api/transactions/t_20261117_02   → 204
//
// The server keeps no state: PATCH answers with the edited entry and DELETE answers 204,
// but the next GET shows the original again. Keep your own edits in the app (that is the practice).
const load = (req, res) => {
  const id = getQuery(req).id;
  const entry = findEntry(id);
  if (!entry) { error(res, 404, 'not_found', `Entry ${id} not found`); return null; }
  return entry;
};

export default route({
  GET: async (req, res) => { const e = load(req, res); if (e) send(res, 200, e); },
  PATCH: async (req, res) => {
    const e = load(req, res); if (!e) return;
    const b = await getBody(req);
    if (!b) return error(res, 400, 'bad_json', 'Body must be valid JSON');
    const changed = Object.keys(b).filter((k) => EDITABLE.includes(k));
    if (!changed.length) return error(res, 400, 'nothing_to_change', `Send at least one of: ${EDITABLE.join(', ')}`);
    const merged = { ...e, ...Object.fromEntries(changed.map((k) => [k, b[k]])) };
    const fields = validateEntry({ ...merged, client_id: 'x' }, true);
    for (const k of Object.keys(fields)) if (!changed.includes(k) && k !== 'amount') delete fields[k];
    if (Object.keys(fields).length) return error(res, 422, 'validation_failed', 'Please fix the highlighted fields', { fields });
    send(res, 200, { ...merged, updated_at: new Date().toISOString() });
  },
  DELETE: async (req, res) => { const e = load(req, res); if (e) send(res, 204, null); },
});
