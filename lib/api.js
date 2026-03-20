// ── Rate limiter ────────────────────────────────────────────────
const callTimestamps = {};
const RATE_LIMITS = {
  binance: { maxCalls: 10, windowMs: 60_000 },
  yahoo: { maxCalls: 5, windowMs: 60_000 },
  exchangerate: { maxCalls: 3, windowMs: 60_000 },
};

function checkRateLimit(source) {
  const now = Date.now();
  const limit = RATE_LIMITS[source];
  if (!limit) return;
  if (!callTimestamps[source]) callTimestamps[source] = [];
  callTimestamps[source] = callTimestamps[source].filter(
    (t) => now - t < limit.windowMs
  );
  if (callTimestamps[source].length >= limit.maxCalls) {
    throw new Error(`Rate limit reached for ${source}`);
  }
  callTimestamps[source].push(now);
}

// ── ExchangeRate API ────────────────────────────────────────────
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';
let cachedRates = null;
let ratesCachedAt = 0;
const RATES_TTL = 10 * 60_000; // 10 min cache

export async function fetchForexRates() {
  if (cachedRates && Date.now() - ratesCachedAt < RATES_TTL) {
    return cachedRates;
  }
  checkRateLimit('exchangerate');
  const res = await fetch(EXCHANGE_RATE_URL);
  if (!res.ok) throw new Error(`ExchangeRate API error: ${res.status}`);
  const data = await res.json();
  cachedRates = data.rates;
  ratesCachedAt = Date.now();
  return cachedRates;
}

// ── Binance API (Crypto) ────────────────────────────────────────
const BINANCE_BASE = 'https://api.binance.com/api/v3';

export async function fetchCryptoTicker(symbol) {
  checkRateLimit('binance');
  const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`);
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
  return res.json();
}

export async function fetchCryptoKlines(symbol, interval, limit) {
  checkRateLimit('binance');
  const url = `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  return res.json();
}

export async function fetchCryptoAsset(pair) {
  const { base, binanceSymbol } = pair;
  const [ticker, rates, klines24h, klines7d] = await Promise.all([
    fetchCryptoTicker(binanceSymbol),
    fetchForexRates(),
    fetchCryptoKlines(binanceSymbol, '1h', 24),
    fetchCryptoKlines(binanceSymbol, '4h', 42),
  ]);

  const usdToTwd = rates.TWD;
  const priceUsd = parseFloat(ticker.lastPrice);
  const priceTwd = priceUsd * usdToTwd;
  const change24h = parseFloat(ticker.priceChangePercent);

  return {
    id: pair.id,
    name: pair.name,
    type: 'crypto',
    priceTwd,
    priceUsd,
    change24h,
    high24hTwd: parseFloat(ticker.highPrice) * usdToTwd,
    low24hTwd: parseFloat(ticker.lowPrice) * usdToTwd,
    volume: parseFloat(ticker.volume),
    volumeUnit: base,
    chart24h: klines24h.map((k) => ({ time: k[0], close: parseFloat(k[4]) * usdToTwd })),
    chart7d: klines7d.map((k) => ({ time: k[0], close: parseFloat(k[4]) * usdToTwd })),
    lastUpdated: Date.now(),
  };
}

// ── Yahoo Finance API (Stocks) ──────────────────────────────────
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function yahooFetch(url) {
  checkRateLimit('yahoo');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);
  return res.json();
}

export async function fetchStockAsset(pair) {
  const { ticker, name, currency } = pair;

  // Fetch 7d of 1h data (covers both 24h and 7d charts)
  const url = `${YAHOO_BASE}/${encodeURIComponent(ticker)}?interval=1h&range=7d`;
  const [data, rates] = await Promise.all([yahooFetch(url), fetchForexRates()]);

  const result = data.chart.result[0];
  const meta = result.meta;
  const timestamps = result.timestamp || [];
  const closes = result.indicators.quote[0].close || [];

  const priceUsd = meta.regularMarketPrice;
  const previousClose = meta.chartPreviousClose || meta.previousClose || priceUsd;
  const usdToTwd = rates.TWD;
  const currencyToTwd = currency === 'TWD' ? 1 : (rates.TWD / (rates[currency] || 1));

  const priceTwd = priceUsd * currencyToTwd;
  const change24h = ((priceUsd - previousClose) / previousClose) * 100;

  // Build chart data points
  const allPoints = timestamps.map((t, i) => ({
    time: t * 1000,
    close: (closes[i] ?? null) !== null ? closes[i] * currencyToTwd : null,
  })).filter((p) => p.close !== null);

  const now = Date.now();
  const chart24h = allPoints.filter((p) => now - p.time <= 24 * 3600_000);
  const chart7d = allPoints;

  // High/low from 24h data
  const prices24h = chart24h.map((p) => p.close);
  const high24hTwd = prices24h.length > 0 ? Math.max(...prices24h) : priceTwd;
  const low24hTwd = prices24h.length > 0 ? Math.min(...prices24h) : priceTwd;

  return {
    id: pair.id,
    name,
    type: 'stock',
    priceTwd,
    priceUsd: priceUsd * (currency === 'TWD' ? (1 / usdToTwd) : (currency === 'USD' ? 1 : (rates.USD / (rates[currency] || 1)))),
    change24h,
    high24hTwd,
    low24hTwd,
    volume: meta.regularMarketVolume || 0,
    volumeUnit: 'shares',
    chart24h: chart24h.length > 1 ? chart24h : allPoints.slice(-2),
    chart7d,
    lastUpdated: Date.now(),
  };
}

// ── Forex ───────────────────────────────────────────────────────
export async function fetchForexAsset(pair) {
  const { base, quote, name } = pair;
  const rates = await fetchForexRates();

  const baseToUsd = 1 / (rates[base] || 1);
  const quotePerBase = baseToUsd * (rates[quote] || 1);

  // Forex has no intraday chart from this API, generate a flat line
  const now = Date.now();
  const fakeChart = Array.from({ length: 24 }, (_, i) => ({
    time: now - (23 - i) * 3600_000,
    close: quotePerBase,
  }));

  return {
    id: pair.id,
    name,
    type: 'forex',
    priceTwd: quote === 'TWD' ? quotePerBase : quotePerBase * (rates.TWD / (rates[quote] || 1)),
    priceLocal: quotePerBase,
    priceLocalCurrency: quote,
    change24h: 0, // ExchangeRate free API only provides current rates
    high24hTwd: null,
    low24hTwd: null,
    volume: null,
    volumeUnit: null,
    chart24h: fakeChart,
    chart7d: fakeChart,
    lastUpdated: Date.now(),
  };
}
