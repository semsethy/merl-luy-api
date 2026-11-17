// Run the API locally without Vercel:  npm run dev  → http://localhost:3000/api
// Mimics Vercel file routing: api/foo.js → /api/foo, api/foo/[id].js → /api/foo/:id
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 3000;

async function resolve(urlPath) {
  const parts = urlPath.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] !== 'api') return null;
  const tryFile = (p) => fs.existsSync(p) ? p : null;
  const exact = tryFile(path.join(root, ...parts) + '.js') || tryFile(path.join(root, ...parts, 'index.js'));
  if (exact) return { file: exact, params: {} };
  const dir = path.join(root, ...parts.slice(0, -1));
  if (fs.existsSync(dir)) {
    const dyn = fs.readdirSync(dir).find((f) => /^\[.+\]\.js$/.test(f));
    if (dyn) return { file: path.join(dir, dyn), params: { [dyn.slice(1, -4)]: decodeURIComponent(parts.at(-1)) } };
  }
  return null;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith('/api')) {
    const file = path.join(root, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(fs.readFileSync(file)); }
  }
  const route = await resolve(url.pathname);
  if (!route) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ error: { code: 'not_found', message: 'No such endpoint' } })); }
  req.query = { ...Object.fromEntries(url.searchParams.entries()), ...route.params };
  const mod = await import(pathToFileURL(route.file).href);
  await mod.default(req, res);
}).listen(PORT, () => console.log(`API on http://localhost:${PORT}/api`));
