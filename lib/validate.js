import { CATEGORY_IDS, WALLETS, todayStr } from './data.js';

/**
 * Validates an entry body. `partial` = PATCH (only the fields sent are checked).
 * Returns { fields } with one message per bad field (empty object = valid).
 */
export function validateEntry(b, partial = false) {
  const fields = {};
  const has = (k) => b[k] !== undefined;
  const need = (k) => !partial || has(k);

  if (!partial && !b.client_id) fields.client_id = 'Required. Create one UUID per new entry and reuse it when you retry.';
  if (need('kind') && !['expense', 'income'].includes(b.kind)) fields.kind = 'Must be "expense" or "income"';
  if (need('currency') && !['USD', 'KHR'].includes(b.currency)) fields.currency = 'Must be "USD" or "KHR"';
  if (need('amount')) {
    const a = Number(b.amount);
    if (!(typeof b.amount === 'number' && a > 0)) fields.amount = 'Must be a number greater than 0';
    else if (b.currency === 'KHR' && !Number.isInteger(a)) fields.amount = 'Riel amounts are whole numbers';
    else if (a > 1e9) fields.amount = 'Too large';
  }
  if (need('category') && !CATEGORY_IDS.includes(b.category)) fields.category = 'Choose a category.';
  if (need('wallet_id') && !WALLETS.some((w) => w.id === b.wallet_id)) fields.wallet_id = 'This wallet no longer exists. Pick another wallet.';
  if (need('spent_on')) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.spent_on || '') || Number.isNaN(Date.parse(b.spent_on))) fields.spent_on = 'Use YYYY-MM-DD';
    else if (b.spent_on > todayStr()) fields.spent_on = 'Can’t be in the future';
  }
  if (has('merchant') && b.merchant !== null && String(b.merchant).length > 60) fields.merchant = 'Max 60 characters';
  if (has('note') && b.note !== null && String(b.note).length > 200) fields.note = 'Max 200 characters';
  return fields;
}

export const EDITABLE = ['kind', 'amount', 'currency', 'category', 'merchant', 'wallet_id', 'spent_on', 'note'];
