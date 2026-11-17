// Shared helpers: JSON responses, CORS, chaos params (delay / fail / status), body parsing.
import crypto from 'node:crypto';

export function getQuery(req) {
  const url = new URL(req.url, 'http://localhost');
  return { ...Object.fromEntries(url.searchParams.entries()), ...(req.query || {}) };
}

export async function getBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch { return null; } }
    if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8') || '{}'); } catch { return null; } }
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (status === 204 || status === 304) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function error(res, status, code, message, extra = {}) {
  send(res, status, { error: { code, message, ...extra } });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wraps a handler with CORS, a method check and the chaos params that work on EVERY endpoint:
 *   ?delay=2000   wait 2000 ms before answering (max 8000)
 *   ?fail=0.3     30% chance of HTTP 500
 *   ?status=503   always answer with this status
 * `methods` maps HTTP method → function(req, res, query).
 */
export function route(methods) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', [...Object.keys(methods), 'OPTIONS'].join(','));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-None-Match');
    res.setHeader('Access-Control-Expose-Headers', 'ETag, X-Request-Id');
    res.setHeader('X-Request-Id', crypto.randomUUID());
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    const fn = methods[req.method];
    if (!fn) return error(res, 405, 'method_not_allowed', `Use ${Object.keys(methods).join(' or ')}`);

    const q = getQuery(req);
    const delay = Math.min(Math.max(parseInt(q.delay || '0', 10) || 0, 0), 8000);
    if (delay) await sleep(delay);
    const forced = parseInt(q.status || '', 10);
    if (forced >= 400 && forced <= 599) return error(res, forced, 'forced_status', `Forced by ?status=${forced}`);
    const fail = parseFloat(q.fail || '0');
    if (fail > 0 && Math.random() < fail) return error(res, 500, 'random_failure', `Random failure from ?fail=${fail}. Try again.`);
    try {
      await fn(req, res, q);
    } catch (e) {
      console.error(e);
      error(res, 500, 'internal_error', 'Something went wrong on the server');
    }
  };
}

/** JSON with ETag + Cache-Control; answers 304 when If-None-Match matches. */
export function sendCacheable(req, res, data, maxAge = 60) {
  const tag = '"' + crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 16) + '"';
  const headers = { ETag: tag, 'Cache-Control': `public, max-age=${maxAge}` };
  if (req.headers['if-none-match'] === tag) return send(res, 304, null, headers);
  send(res, 200, data, headers);
}
