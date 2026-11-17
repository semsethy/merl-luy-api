// Smoke test. Start the API first (npm run dev), then: npm test
// Or test the deployed one: BASE=https://your-app.vercel.app npm test
const BASE = process.env.BASE || 'http://localhost:3000';
let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('✅', name); } catch (e) { failed++; console.log('❌', name, '—', e.message); }
}
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m); };
const j = async (path, opts = {}) => {
  const r = await fetch(BASE + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const text = await r.text();
  return { status: r.status, headers: r.headers, body: text ? JSON.parse(text) : null };
};
const month = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7);
const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const good = { client_id: 'c0ffee00-1111-2222-3333-444455556666', kind: 'expense', amount: 18000, currency: 'KHR',
  category: 'groceries', merchant: 'Lucky Supermarket', wallet_id: 'wal_personal', spent_on: today, note: null };

await check('GET /api', async () => eq((await j('/api')).status, 200, 'status'));
await check('summary has both currencies + days_left', async () => {
  const r = await j('/api/summary');
  eq(r.body.month, month, 'month'); ok(r.body.totals.USD && r.body.totals.KHR, 'totals'); ok(r.body.days_left >= 0, 'days_left');
  ok(typeof r.body.totals.USD.previous_month_expense === 'number', 'previous');
});
await check('summary matches transaction list (USD expense)', async () => {
  const s = (await j('/api/summary')).body.totals.USD.expense;
  let sum = 0, offset = 0, more = true;
  while (more) {
    const r = (await j(`/api/transactions?kind=expense&limit=100&offset=${offset}`)).body;
    for (const e of r.data) if (e.currency === 'USD') sum += e.amount;
    more = r.has_more; offset += 100;
  }
  eq(Math.round(sum * 100) / 100, s, 'sum');
});
await check('transactions page + newest first', async () => {
  const r = await j('/api/transactions?limit=20');
  eq(r.body.data.length <= 20, true, 'len');
  for (let i = 1; i < r.body.data.length; i++) ok(r.body.data[i - 1].created_at >= r.body.data[i].created_at, 'order');
});
await check('older month + offset paging', async () => {
  const [y, m] = month.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const a = (await j(`/api/transactions?month=${prev}&limit=50`)).body;
  const b = (await j(`/api/transactions?month=${prev}&limit=50&offset=50`)).body;
  ok(a.total > 100, 'total'); eq(a.has_more, true, 'has_more'); ok(a.data[0].id !== b.data[0].id, 'different pages');
});
await check('search q matches merchant or note', async () => {
  const r = (await j('/api/transactions?q=coffee')).body;
  ok(r.data.every((e) => (e.merchant || '').toLowerCase().includes('coffee') || (e.note || '').toLowerCase().includes('coffee')), 'filter');
});
await check('search no results', async () => eq((await j('/api/transactions?q=zzzz')).body.total, 0, 'total'));
await check('kind=income', async () => ok((await j('/api/transactions?kind=income&month=' + month)).body.data.every((e) => e.kind === 'income'), 'kind'));
await check('bad month → 400', async () => eq((await j('/api/transactions?month=2026-13')).status, 400, 'status'));
let anId;
await check('GET one entry', async () => {
  anId = (await j('/api/transactions?limit=1')).body.data[0].id;
  eq((await j('/api/transactions/' + anId)).body.id, anId, 'id');
});
await check('unknown id → 404', async () => eq((await j('/api/transactions/t_19990101_00')).status, 404, 'status'));
await check('POST valid → 201, same client_id → same id', async () => {
  const a = await j('/api/transactions', { method: 'POST', body: JSON.stringify(good) });
  const b = await j('/api/transactions', { method: 'POST', body: JSON.stringify(good) });
  eq(a.status, 201, 'status'); eq(a.body.id, b.body.id, 'same id');
});
await check('POST no category → 422 "Choose a category."', async () => {
  const r = await j('/api/transactions', { method: 'POST', body: JSON.stringify({ ...good, category: null }) });
  eq(r.status, 422, 'status'); eq(r.body.error.fields.category, 'Choose a category.', 'msg');
});
await check('POST riel with decimals + future date + bad wallet → 422', async () => {
  const r = await j('/api/transactions', { method: 'POST', body: JSON.stringify({ ...good, amount: 10.5, spent_on: '2999-01-01', wallet_id: 'wal_gone' }) });
  ok(r.body.error.fields.amount && r.body.error.fields.spent_on && r.body.error.fields.wallet_id, 'fields');
});
await check('POST ?simulate=duplicate → 409', async () => {
  const r = await j('/api/transactions?simulate=duplicate', { method: 'POST', body: JSON.stringify(good) });
  eq(r.status, 409, 'status'); ok(r.body.error.existing_id, 'existing_id');
});
await check('PATCH changes only sent fields', async () => {
  const r = await j('/api/transactions/' + anId, { method: 'PATCH', body: JSON.stringify({ note: 'Edited' }) });
  eq(r.status, 200, 'status'); eq(r.body.note, 'Edited', 'note'); eq(r.body.id, anId, 'id');
});
await check('PATCH bad category → 422', async () => {
  eq((await j('/api/transactions/' + anId, { method: 'PATCH', body: JSON.stringify({ category: 'cars' }) })).status, 422, 'status');
});
await check('PATCH empty → 400', async () => eq((await j('/api/transactions/' + anId, { method: 'PATCH', body: '{}' })).status, 400, 'status'));
await check('DELETE → 204', async () => eq((await j('/api/transactions/' + anId, { method: 'DELETE' })).status, 204, 'status'));
await check('categories (10) + ETag 304', async () => {
  const a = await j('/api/categories'); eq(a.body.data.length, 10, 'count');
  const b = await fetch(BASE + '/api/categories', { headers: { 'If-None-Match': a.headers.get('etag') } }); eq(b.status, 304, '304');
});
await check('wallets + budgets', async () => {
  eq((await j('/api/wallets')).body.data.length, 3, 'wallets'); eq((await j('/api/budgets')).body.data.length, 4, 'budgets');
});
await check('perf: 3000 in one response', async () => eq((await j('/api/perf/transactions?count=3000')).body.count, 3000, 'count'));
await check('chaos ?status=503', async () => eq((await j('/api/summary?status=503')).status, 503, 'status'));
await check('chaos ?fail=1', async () => eq((await j('/api/summary?fail=1')).status, 500, 'status'));
await check('chaos ?delay=1000 waits', async () => {
  const t = Date.now(); await j('/api/wallets?delay=1000'); ok(Date.now() - t >= 950, 'too fast');
});
await check('wrong method → 405', async () => eq((await j('/api/summary', { method: 'POST' })).status, 405, 'status'));
console.log(failed ? `\n${failed} failed` : '\nAll passed');
process.exit(failed ? 1 : 0);
