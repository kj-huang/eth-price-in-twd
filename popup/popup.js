const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const CATEGORY_ASSETS = {
  crypto: ['eth-twd', 'btc-twd', 'sol-twd'],
  stocks: ['aapl', 'tsmc', 'nvda'],
  forex: ['usd-twd', 'eur-twd', 'jpy-twd'],
};

const ICONS = {
  'eth-twd': 'ETH', 'btc-twd': 'BTC', 'sol-twd': 'SOL',
  aapl: 'AAPL', tsmc: 'TSM', nvda: 'NV',
  'usd-twd': 'US$', 'eur-twd': 'EU€', 'jpy-twd': 'JP¥',
};

let currentCategory = 'crypto';
let currentAsset = null;
let currentChartRange = '24h';
let allAssets = {};

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupCategoryTabs();
  setupRefresh();
  setupBack();
  setupChartTabs();
});

async function loadData() {
  const data = await chrome.storage.local.get(['assets', 'lastUpdated']);
  if (!data.assets || Object.keys(data.assets).length === 0) {
    $('#assetList').innerHTML = '<div class="loading">Fetching prices...</div>';
    chrome.runtime.sendMessage({ action: 'refresh' });
    setTimeout(loadData, 3000);
    return;
  }
  allAssets = data.assets;
  if (data.lastUpdated) {
    const d = new Date(data.lastUpdated);
    $('#updated').textContent = `Updated ${d.toLocaleTimeString()}`;
  }
  renderAssetList();
}

function renderAssetList() {
  const ids = CATEGORY_ASSETS[currentCategory] || [];
  const list = $('#assetList');

  if (ids.length === 0) {
    list.innerHTML = '<div class="loading">No assets configured</div>';
    return;
  }

  list.innerHTML = ids.map((id) => {
    const a = allAssets[id];
    if (!a) return '';
    const iconClass = a.type === 'stock' ? 'stock' : a.type;
    const changeClass = a.change24h > 0 ? 'up' : a.change24h < 0 ? 'down' : 'neutral';
    const sign = a.change24h > 0 ? '+' : '';
    const displayPrice = a.type === 'forex'
      ? `${a.priceLocal.toFixed(4)}`
      : `NT$${formatNum(a.priceTwd, 0)}`;

    return `
      <div class="asset-row" data-id="${id}">
        <div class="asset-icon ${iconClass}">${ICONS[id] || id.slice(0, 3).toUpperCase()}</div>
        <div class="asset-info">
          <div class="asset-name">${a.name}</div>
          <div class="asset-label">${a.type === 'forex' ? a.priceLocalCurrency : a.type}</div>
        </div>
        <canvas class="asset-spark" data-id="${id}" width="100" height="48"></canvas>
        <div class="asset-right">
          <div class="asset-price">${displayPrice}</div>
          <div class="asset-change ${changeClass}">${sign}${a.change24h.toFixed(2)}%</div>
        </div>
      </div>`;
  }).join('');

  // Draw sparklines
  list.querySelectorAll('.asset-spark').forEach((canvas) => {
    const id = canvas.dataset.id;
    const a = allAssets[id];
    if (a && a.chart24h && a.chart24h.length > 1) {
      drawSparkline(canvas, a.chart24h, a.change24h >= 0);
    }
  });

  // Click handlers
  list.querySelectorAll('.asset-row').forEach((row) => {
    row.addEventListener('click', () => openDetail(row.dataset.id));
  });
}

function openDetail(id) {
  const a = allAssets[id];
  if (!a) return;
  currentAsset = a;
  currentChartRange = '24h';

  // Hide list, show detail
  $('#assetList').classList.add('hidden');
  $$('.category-tabs')[0].classList.add('hidden');
  $('#detailPanel').classList.remove('hidden');

  // Fill detail
  $('#detailName').textContent = a.name;
  $('#detailType').textContent = a.type;
  $('#detailPrice').textContent = formatNum(a.priceTwd, a.type === 'forex' ? 4 : 0);

  const changeEl = $('#detailChange');
  const sign = a.change24h > 0 ? '+' : '';
  changeEl.textContent = `${sign}${a.change24h.toFixed(2)}%`;
  changeEl.className = `change ${a.change24h > 0 ? 'up' : a.change24h < 0 ? 'down' : 'neutral'}`;

  if (a.type === 'forex') {
    $('#detailSubprice').textContent = `1 ${a.name.split('/')[0]} = ${a.priceLocal.toFixed(4)} ${a.priceLocalCurrency}`;
  } else {
    $('#detailSubprice').textContent = `$${formatNum(a.priceUsd, 2)} USD`;
  }

  // Stats
  const statsEl = $('#detailStats');
  if (a.type === 'forex') {
    statsEl.innerHTML = `
      <div class="stat"><span class="stat-label">Rate</span><span class="stat-value">${a.priceLocal.toFixed(4)}</span></div>
      <div class="stat"><span class="stat-label">TWD Value</span><span class="stat-value">NT$${formatNum(a.priceTwd, 2)}</span></div>`;
  } else {
    const stats = [
      a.high24hTwd != null ? { label: '24h High', value: `NT$${formatNum(a.high24hTwd, 0)}` } : null,
      a.low24hTwd != null ? { label: '24h Low', value: `NT$${formatNum(a.low24hTwd, 0)}` } : null,
      a.volume != null ? { label: 'Volume', value: `${formatNum(a.volume, 1)} ${a.volumeUnit}` } : null,
    ].filter(Boolean);
    statsEl.innerHTML = stats.map((s) =>
      `<div class="stat"><span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>`
    ).join('');
  }

  // Chart
  resetChartTabs();
  drawDetailChart();
}

function closeDetail() {
  $('#detailPanel').classList.add('hidden');
  $('#assetList').classList.remove('hidden');
  $$('.category-tabs')[0].classList.remove('hidden');
  currentAsset = null;
}

function setupCategoryTabs() {
  $$('.cat-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.cat-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.cat;
      renderAssetList();
    });
  });
}

function setupRefresh() {
  const btn = $('#refreshBtn');
  btn.addEventListener('click', async () => {
    btn.classList.add('spinning');
    await chrome.runtime.sendMessage({ action: 'refresh' });
    await new Promise((r) => setTimeout(r, 1500));
    await loadData();
    if (currentAsset) {
      currentAsset = allAssets[currentAsset.id];
      if (currentAsset) drawDetailChart();
    }
    btn.classList.remove('spinning');
  });
}

function setupBack() {
  $('#backBtn').addEventListener('click', closeDetail);
}

function setupChartTabs() {
  $$('.chart-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.chart-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentChartRange = tab.dataset.range;
      drawDetailChart();
    });
  });
}

function resetChartTabs() {
  $$('.chart-tab').forEach((t) => t.classList.remove('active'));
  $$('.chart-tab')[0].classList.add('active');
  currentChartRange = '24h';
}

// ── Sparkline ─────────────────────────────────────────────────
function drawSparkline(canvas, data, isUp) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const prices = data.map((d) => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const color = isUp ? '#22c55e' : '#ef4444';

  ctx.beginPath();
  prices.forEach((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ── Detail Chart ──────────────────────────────────────────────
function drawDetailChart() {
  if (!currentAsset) return;
  const data = currentChartRange === '24h' ? currentAsset.chart24h : currentAsset.chart7d;
  if (!data || data.length < 2) return;

  const canvas = $('#chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const pad = { top: 10, right: 10, bottom: 22, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const prices = data.map((d) => d.close);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const toX = (i) => pad.left + (i / (data.length - 1)) * plotW;
  const toY = (p) => pad.top + plotH - ((p - minP) / range) * plotH;

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#22c55e' : '#ef4444';
  const fillColor = isUp ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)';

  // Grid
  ctx.strokeStyle = '#1e2235';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad.top + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  // Y labels
  ctx.fillStyle = '#3e4258';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const val = maxP - (range / 3) * i;
    const y = pad.top + (plotH / 3) * i;
    ctx.fillText(formatCompact(val), pad.left - 5, y + 3);
  }

  // X labels
  ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) {
    const idx = Math.round((i / 4) * (data.length - 1));
    const x = toX(idx);
    const d = new Date(data[idx].time);
    const label = currentChartRange === '24h'
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    ctx.fillText(label, x, h - 4);
  }

  // Area
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(prices[0]));
  for (let i = 1; i < prices.length; i++) ctx.lineTo(toX(i), toY(prices[i]));
  ctx.lineTo(toX(prices.length - 1), pad.top + plotH);
  ctx.lineTo(toX(0), pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(prices[0]));
  for (let i = 1; i < prices.length; i++) ctx.lineTo(toX(i), toY(prices[i]));
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dot
  const lastX = toX(prices.length - 1);
  const lastY = toY(prices[prices.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = isUp ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)';
  ctx.fill();
}

// ── Formatters ────────────────────────────────────────────────
function formatNum(num, decimals) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(num) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 10_000) return `${(num / 1000).toFixed(0)}K`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  if (num >= 1) return num.toFixed(1);
  return num.toFixed(4);
}
