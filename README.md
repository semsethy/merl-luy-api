# Merl Luy Practice API

A small API for practising the **Merl Luy** iOS app with 4 screens: **Home**, **Activity**, **Add entry** and **Edit entry**. Build those screens once in **UIKit** and once in **SwiftUI**, then use the performance labs to break them, measure the problem and fix it.

There's no database. Every entry is generated from its date, so the data always looks the same and the API never needs a reset. It's free to host on Vercel.

## Deploy: GitHub → Vercel (about 5 minutes)

1. On GitHub, create a new **empty** repository called `merl-luy-api`.
2. Push this folder to it:
   ```bash
   cd merl-luy-api
   git init && git add . && git commit -m "Merl Luy practice API"
   git branch -M main
   git remote add origin https://github.com/<your-username>/merl-luy-api.git
   git push -u origin main
   ```
3. Go to <https://vercel.com/new>, sign in with GitHub, and **Import** `merl-luy-api`.
   - Framework Preset: **Other**. Leave the build command and output directory empty.
   - Click **Deploy**.
4. Open `https://<your-project>.vercel.app/api`. You should see the endpoint list.

After that, every `git push` to `main` redeploys automatically.

## Run it on your Mac (no Vercel needed)

```bash
npm run dev                                         # http://localhost:3000/api
npm test                                            # in a 2nd terminal: 26 checks
BASE=https://<your-project>.vercel.app npm test     # test the deployed copy
```

The iOS Simulator can reach `http://localhost:3000`. For plain `http`, add this ATS exception to the app's Info.plist **only for Debug**:

```xml
<key>NSAppTransportSecurity</key>
<dict><key>NSExceptionDomains</key><dict>
  <key>localhost</key><dict><key>NSExceptionAllowsInsecureHTTPLoads</key><true/></dict>
</dict></dict>
```

## Which screen uses what

| Screen | Calls |
|---|---|
| Home | `GET /api/summary` + `GET /api/transactions?limit=5` (run both at the same time) |
| Activity | `GET /api/transactions?month=&kind=&q=&limit=50&offset=` (load more as you scroll) |
| Add entry (sheet) | `GET /api/categories`, `GET /api/wallets`, `POST /api/transactions` |
| Edit entry (push) | `GET /api/transactions/{id}`, `PATCH /api/transactions/{id}`, `DELETE /api/transactions/{id}` |
| Perf labs | `GET /api/perf/transactions?count=3000`, `GET /api/perf/slow?ms=3000` |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/summary?month=2026-11&wallet_id=` | `totals.USD` / `totals.KHR` → `{expense, income, previous_month_expense, by_category[]}`, plus `days_left` and `over_budget` (the budget banner, or `null`) |
| GET | `/api/transactions` | `month` (default this month), `kind=expense\|income`, `q` (merchant or note), `wallet_id`, `limit` (max 100, default 50), `offset`. Newest first |
| POST | `/api/transactions` | body below → `201` with the new entry |
| GET | `/api/transactions/{id}` | e.g. `t_20261117_02` |
| PATCH | `/api/transactions/{id}` | send **only the changed fields** → `200` with the edited entry |
| DELETE | `/api/transactions/{id}` | → `204` |
| GET | `/api/categories` | 10 categories, with the design's colours. Sends `ETag` + `max-age=3600` |
| GET | `/api/wallets` | Personal, Family, Shop |
| GET | `/api/budgets` | this month's budgets with `spent` and `is_over` |
| GET | `/api/perf/transactions?count=3000` | up to 6000 entries in **one** response, with no paging |
| GET | `/api/perf/slow?ms=3000` | answers after `ms` milliseconds (max 8000) |

### Entry shape

```json
{
  "id": "t_20261117_02",
  "client_id": null,
  "kind": "expense",
  "amount": 18000,
  "currency": "KHR",
  "category": "groceries",
  "merchant": "Lucky Supermarket",
  "wallet_id": "wal_personal",
  "spent_on": "2026-11-17",
  "note": null,
  "created_at": "2026-11-17T09:41:00+07:00",
  "receipt_thumb_url": "https://picsum.photos/seed/t_20261117_02/120/160",
  "receipt_image_url": "https://picsum.photos/seed/t_20261117_02/2400/3200"
}
```

About 30% of expenses have a receipt photo. `receipt_image_url` is large (2400×3200) on purpose, for the image lab.

### POST body (Add entry)

```json
{ "client_id": "8F1C…-UUID", "kind": "expense", "amount": 18000, "currency": "KHR",
  "category": "groceries", "merchant": "Lucky Supermarket", "wallet_id": "wal_personal",
  "spent_on": "2026-11-17", "note": null }
```

Rules (a broken rule returns `422` with a message per field in `error.fields`):

- `client_id` is required. Make one `UUID()` when the sheet opens and reuse it if you retry. The same `client_id` always returns the same `id`, so a retry never creates a second entry.
- `category` is required. Its error message is `"Choose a category."`, matching the design.
- KHR amounts must be whole numbers.
- `spent_on` can't be in the future.
- An unknown `wallet_id` returns `"This wallet no longer exists…"`.
- `?simulate=duplicate` returns `409` with `existing_id`. Treat that as "already saved".

### The server doesn't remember changes

POST, PATCH and DELETE give the right answers, but the next GET shows the original data again. Keep your own changes in the app: insert, replace or remove the row in your list after a success. That's the normal pattern anyway.

## Chaos params (work on every endpoint)

| Param | Effect | Use it for |
|---|---|---|
| `?delay=3000` | waits 3 s | loading skeletons, timeouts, cancelling |
| `?fail=0.3` | 30% of requests return `500` | retry and error states |
| `?status=503` | always returns `503` | the "couldn't load" state |

## Error shape

```json
{ "error": { "code": "validation_failed", "message": "Please fix the highlighted fields",
             "fields": { "category": "Choose a category." } } }
```

Codes: `bad_json`, `bad_month`, `nothing_to_change` (400) · `not_found` (404) · `method_not_allowed` (405) · `duplicate` (409) · `validation_failed` (422) · `random_failure`, `internal_error` (500) · `forced_status`.

## Limits

Vercel caps a response at 4.5 MB, so `/api/perf/transactions` stops at 6000 entries (about 1.9 MB). Receipt photos come from `picsum.photos` and are random pictures, not real receipts.
