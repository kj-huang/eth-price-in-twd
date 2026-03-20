import { fetchCryptoAsset, fetchStockAsset, fetchForexAsset } from './lib/api.js';
import { DEFAULT_ASSETS } from './lib/config.js';

const ALARM_NAME = 'refresh-all-prices';
const REFRESH_INTERVAL_MINUTES = 2;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_INTERVAL_MINUTES });
  fetchAll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchAll();
  }
});

async function fetchAll() {
  const results = {};
  const errors = [];

  // Fetch crypto pairs
  for (const pair of DEFAULT_ASSETS.crypto) {
    try {
      results[pair.id] = await fetchCryptoAsset(pair);
    } catch (err) {
      errors.push(`${pair.id}: ${err.message}`);
    }
  }

  // Fetch stocks sequentially to respect Yahoo rate limits
  for (const pair of DEFAULT_ASSETS.stocks) {
    try {
      results[pair.id] = await fetchStockAsset(pair);
    } catch (err) {
      errors.push(`${pair.id}: ${err.message}`);
    }
    // Small delay between Yahoo calls
    await sleep(500);
  }

  // Fetch forex pairs (all use cached rates, fast)
  for (const pair of DEFAULT_ASSETS.forex) {
    try {
      results[pair.id] = await fetchForexAsset(pair);
    } catch (err) {
      errors.push(`${pair.id}: ${err.message}`);
    }
  }

  // Update badge with first crypto price
  const firstCrypto = results[DEFAULT_ASSETS.crypto[0]?.id];
  if (firstCrypto) {
    const badgeText = formatBadge(firstCrypto.priceTwd);
    const badgeColor = firstCrypto.change24h >= 0 ? '#22c55e' : '#ef4444';
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    chrome.action.setBadgeTextColor({ color: '#ffffff' });
  }

  await chrome.storage.local.set({
    assets: results,
    lastUpdated: Date.now(),
    errors: errors.length > 0 ? errors : null,
  });
}

function formatBadge(price) {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)}M`;
  if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
  return price.toFixed(0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'refresh') {
    fetchAll().then(() => sendResponse({ ok: true }));
    return true;
  }
});
