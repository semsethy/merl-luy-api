import { route, sendCacheable } from '../lib/http.js';
import { WALLETS } from '../lib/data.js';

// GET /api/wallets
export default route({ GET: async (req, res) => sendCacheable(req, res, { data: WALLETS }, 3600) });
