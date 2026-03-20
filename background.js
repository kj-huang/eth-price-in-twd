const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT';
const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines';
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

const ALARM_NAME = 'refresh-eth-price';
const REFRESH_INTERVAL_MINUTES = 1;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_INTERVAL_MINUTES });
  fetchAndStore();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchAndStore();
  }
});

async function fetchUsdToTwd() {
  const res = await fetch(EXCHANGE_RATE_URL);
  if (!res.ok) throw new Error(`ExchangeRate API error: ${res.status}`);
  const data = await res.json();
  return data.rates.TWD;
}

async function fetchEthTicker() {
  const res = await fetch(BINANCE_TICKER_URL);
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
  return res.json();
}

async function fetchKlines(interval, limit) {
  const url = `${BINANCE_KLINES_URL}?symbol=ETHUSDT&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  return res.json();
}

async function fetchAndStore() {
  try {
    const [ticker, usdToTwd, klines24h, klines7d] = await Promise.all([
      fetchEthTicker(),
      fetchUsdToTwd(),
      fetchKlines('1h', 24),
      fetchKlines('4h', 42),
    ]);

    const priceUsd = parseFloat(ticker.lastPrice);
    const priceTwd = priceUsd * usdToTwd;
    const change24h = parseFloat(ticker.priceChangePercent);
    const high24hTwd = parseFloat(ticker.highPrice) * usdToTwd;
    const low24hTwd = parseFloat(ticker.lowPrice) * usdToTwd;
    const volume24h = parseFloat(ticker.volume);

    const chart24h = klines24h.map((k) => ({
      time: k[0],
      close: parseFloat(k[4]) * usdToTwd,
    }));

    const chart7d = klines7d.map((k) => ({
      time: k[0],
      close: parseFloat(k[4]) * usdToTwd,
    }));

    const badgeText = formatBadge(priceTwd);
    const badgeColor = change24h >= 0 ? '#22c55e' : '#ef4444';
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    chrome.action.setBadgeTextColor({ color: '#ffffff' });

    await chrome.storage.local.set({
      priceTwd,
      priceUsd,
      change24h,
      high24hTwd,
      low24hTwd,
      volume24h,
      usdToTwd,
      chart24h,
      chart7d,
      lastUpdated: Date.now(),
    });
  } catch (err) {
    console.error('Failed to fetch ETH price:', err);
  }
}

function formatBadge(price) {
  if (price >= 1000000) return `${(price / 1000000).toFixed(0)}M`;
  if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
  return price.toFixed(0);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'refresh') {
    fetchAndStore().then(() => sendResponse({ ok: true }));
    return true;
  }
});
