// Deterministic fake data for Merl Luy. No database: every row is generated from its date
// and position, so the same id always returns the same entry.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;

// Colours match the Merl Luy design (tile background + icon colour).
export const CATEGORIES = [
  { id: 'food', name: 'Food', bg: '#FCE6DC', fg: '#B4401A', bar: '#7FD1AE' },
  { id: 'coffee', name: 'Coffee', bg: '#F3E8DC', fg: '#7C4A1E', bar: '#C9A27A' },
  { id: 'groceries', name: 'Groceries', bg: '#E3F1EA', fg: '#0B6E4F', bar: '#4E7A69' },
  { id: 'transport', name: 'Transport', bg: '#E0E9FB', fg: '#1D4ED8', bar: '#9DB8F5' },
  { id: 'shopping', name: 'Shopping', bg: '#FCE7F3', fg: '#9D174D', bar: '#F0A6CA' },
  { id: 'bills', name: 'Bills', bg: '#FDF0D5', fg: '#92400E', bar: '#F4C46B' },
  { id: 'health', name: 'Health', bg: '#FDE7E4', fg: '#B42318', bar: '#F29B8F' },
  { id: 'entertainment', name: 'Entertainment', bg: '#EDE9FE', fg: '#6D28D9', bar: '#B9A6F5' },
  { id: 'education', name: 'Education', bg: '#E0F2FE', fg: '#0369A1', bar: '#7CC4EE' },
  { id: 'other', name: 'Other', bg: '#EEF0EC', fg: '#3C4641', bar: '#9AA39E' },
];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const WALLETS = [
  { id: 'wal_personal', name: 'Personal', is_default: true },
  { id: 'wal_family', name: 'Family', is_default: false },
  { id: 'wal_shop', name: 'Shop', is_default: false },
];

// Budgets for the Home banner (amounts in the budget's currency).
export const BUDGETS = [
  { id: 'bud_coffee', category: 'coffee', currency: 'USD', limit: 30 },
  { id: 'bud_food', category: 'food', currency: 'USD', limit: 150 },
  { id: 'bud_transport', category: 'transport', currency: 'KHR', limit: 150000 },
  { id: 'bud_shopping', category: 'shopping', currency: 'USD', limit: 80 },
];

const MERCHANTS = [
  ['Brown Coffee BKK1', 'coffee', 'USD', 1.5, 4.5],
  ['Amazon Café', 'coffee', 'USD', 1.75, 3.75],
  ['Starbucks Aeon', 'coffee', 'USD', 3, 6],
  ['Lucky Supermarket', 'groceries', 'KHR', 8000, 80000],
  ['Chip Mong Mart', 'groceries', 'USD', 5, 40],
  ['Orussey Market', 'groceries', 'KHR', 4000, 40000],
  ['Nham24', 'food', 'USD', 3, 12],
  ['Pizza Company', 'food', 'USD', 8, 20],
  ['Bai Sach Chrouk stall', 'food', 'KHR', 6000, 10000],
  ['Kuy Teav shop', 'food', 'KHR', 7000, 12000],
  ['PassApp', 'transport', 'KHR', 4000, 15000],
  ['Grab', 'transport', 'KHR', 5000, 20000],
  ['Total Gas Station', 'transport', 'USD', 5, 25],
  ['Aeon Mall', 'shopping', 'USD', 6, 60],
  ['Shopee', 'shopping', 'USD', 3, 35],
  ['EDC Electricity', 'bills', 'USD', 25, 60],
  ['Phnom Penh Water', 'bills', 'KHR', 20000, 60000],
  ['Ezecom Internet', 'bills', 'USD', 20, 35],
  ['Cellcard Top-up', 'bills', 'USD', 1, 5],
  ['U-Care Pharmacy', 'health', 'USD', 3, 25],
  ['Legend Cinema', 'entertainment', 'USD', 4, 12],
  ['Spotify', 'entertainment', 'USD', 5.99, 5.99],
  ['Book shop Monument', 'education', 'KHR', 10000, 60000],
  ['English class', 'education', 'USD', 30, 30],
  [null, 'other', 'KHR', 2000, 20000],
];
const NOTES = ['Lunch with team', 'Weekend', 'For mum', 'Split with Sophea', 'Monthly', 'Birthday gift', 'Late night'];

// ---------- Dates (Phnom Penh time, UTC+7) ----------
export function todayStr() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
export const dayNumber = (s) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000);
export const dayString = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const HISTORY_DAYS = 1100; // about 3 years of data (≈6,000 entries)

/** Every entry for one day, newest first. */
export function entriesForDay(day) {
  const n = dayNumber(day);
  const r = rng(n * 2654435761);
  const count = 3 + Math.floor(r() * 6); // 3–8 a day
  const rows = [];
  const dom = parseInt(day.slice(8, 10), 10);
  for (let i = 0; i < count; i++) rows.push(makeEntry(day, i, rng(n * 7919 + i * 104729)));
  if (dom === 1) rows.push(incomeEntry(day, count, 'Salary', 'USD', 950, 'wal_personal'));
  if (dom === 15) rows.push(incomeEntry(day, count + 1, 'Shop sales', 'KHR', 640000, 'wal_shop'));
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function makeEntry(day, i, r) {
  const [merchant, category, currency, min, max] = pick(r, MERCHANTS);
  let amount = min + r() * (max - min);
  amount = currency === 'KHR' ? Math.round(amount / 500) * 500 : round2(amount);
  const hour = 7 + Math.floor(r() * 15);
  const minute = Math.floor(r() * 60);
  const hasReceipt = r() < 0.3;
  const id = `t_${day.replace(/-/g, '')}_${String(i).padStart(2, '0')}`;
  return {
    id,
    client_id: null,
    kind: 'expense',
    amount,
    currency,
    category,
    merchant,
    wallet_id: r() < 0.75 ? 'wal_personal' : r() < 0.6 ? 'wal_family' : 'wal_shop',
    spent_on: day,
    note: r() < 0.25 ? pick(r, NOTES) : null,
    created_at: `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`,
    receipt_thumb_url: hasReceipt ? `https://picsum.photos/seed/${id}/120/160` : null,
    // Full photo of the receipt — big on purpose (2400×3200) for the image performance lab.
    receipt_image_url: hasReceipt ? `https://picsum.photos/seed/${id}/2400/3200` : null,
  };
}

function incomeEntry(day, i, merchant, currency, amount, wallet) {
  return {
    id: `t_${day.replace(/-/g, '')}_${String(i).padStart(2, '0')}`,
    client_id: null, kind: 'income', amount, currency, category: 'other', merchant, wallet_id: wallet,
    spent_on: day, note: null, created_at: `${day}T08:00:00+07:00`, receipt_thumb_url: null, receipt_image_url: null,
  };
}

export function findEntry(id) {
  const m = /^t_(\d{4})(\d{2})(\d{2})_(\d{2})$/.exec(id || '');
  if (!m) return null;
  const day = `${m[1]}-${m[2]}-${m[3]}`;
  if (Number.isNaN(Date.parse(day))) return null;
  const today = dayNumber(todayStr());
  const n = dayNumber(day);
  if (n > today || n <= today - HISTORY_DAYS) return null;
  return entriesForDay(day).find((e) => e.id === id) || null;
}

/** All entries in a month ("2026-11"), newest first, up to today. */
export function entriesForMonth(month) {
  const today = dayNumber(todayStr());
  const first = dayNumber(`${month}-01`);
  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const out = [];
  for (let d = Math.min(first + daysInMonth - 1, today); d >= first && d > today - HISTORY_DAYS; d--) {
    out.push(...entriesForDay(dayString(d)));
  }
  return out;
}

/** The newest `count` entries across all months (for the perf lab). */
export function newestEntries(count) {
  const out = [];
  let d = dayNumber(todayStr());
  const stop = d - HISTORY_DAYS;
  while (out.length < count && d > stop) { out.push(...entriesForDay(dayString(d))); d--; }
  return out.slice(0, count);
}

export const currentMonth = () => todayStr().slice(0, 7);
export function previousMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
export const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || '');
