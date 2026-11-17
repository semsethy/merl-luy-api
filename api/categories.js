import { route, sendCacheable } from '../lib/http.js';
import { CATEGORIES } from '../lib/data.js';

// GET /api/categories (ETag + max-age=3600 — good for practising URLCache)
export default route({ GET: async (req, res) => sendCacheable(req, res, { data: CATEGORIES }, 3600) });
