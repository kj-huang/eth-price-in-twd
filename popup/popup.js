const $ = (sel) => document.querySelector(sel);

let currentRange = '24h';

document.addEventListener('DOMContentLoaded', async () => {
  await renderData();
  setupTabs();
  setupRefresh();
});

async function renderData() {
  const data = await chrome.storage.local.get([
    'priceTwd', 'priceUsd', 'change24h', 'high24hTwd',
    'low24hTwd', 'volume24h', 'usdToTwd', 'chart24h',
    'chart7d', 'lastUpdated',
  ]);

  if (!data.priceTwd) {
    $('#price').textContent = 'Loading...';
    chrome.runtime.sendMessage({ action: 'refresh' });
    setTimeout(renderData, 2000);
    return;
  }

  $('#price').textContent = formatNumber(data.priceTwd, 0);
  $('#priceUsd').textContent = `$${formatNumber(data.priceUsd, 2)} USD`;

  const changeEl = $('#change');
  const sign = data.change24h >= 0 ? '+' : '';
  changeEl.textContent = `${sign}${data.change24h.toFixed(2)}%`;
  changeEl.className = `change ${data.change24h >= 0 ? 'up' : 'down'}`;

  $('#high').textContent = `NT$${formatNumber(data.high24hTwd, 0)}`;
  $('#low').textContent = `NT$${formatNumber(data.low24hTwd, 0)}`;
  $('#volume').textContent = `${formatNumber(data.volume24h, 1)} ETH`;
  $('#rate').textContent = data.usdToTwd.toFixed(2);

  if (data.lastUpdated) {
    const d = new Date(data.lastUpdated);
    $('#updated').textContent = `Updated ${d.toLocaleTimeString()}`;
  }

  const chartData = currentRange === '24h' ? data.chart24h : data.chart7d;
  if (chartData && chartData.length > 0) {
    drawChart(chartData);
  }
}

function setupTabs() {
  document.querySelectorAll('.chart-tab').forEach((tab) => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.chart-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentRange = tab.dataset.range;
      await renderData();
    });
  });
}

function setupRefresh() {
  const btn = $('#refreshBtn');
  btn.addEventListener('click', async () => {
    btn.classList.add('spinning');
    await chrome.runtime.sendMessage({ action: 'refresh' });
    await new Promise((r) => setTimeout(r, 800));
    await renderData();
    btn.classList.remove('spinning');
  });
}

function drawChart(data) {
  const canvas = $('#chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const pad = { top: 12, right: 12, bottom: 24, left: 50 };
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
  const fillColor = isUp ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

  // Grid lines
  ctx.strokeStyle = '#1e2235';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad.top + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = '#3e4258';
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const val = maxP - (range / 3) * i;
    const y = pad.top + (plotH / 3) * i;
    ctx.fillText(formatCompact(val), pad.left - 6, y + 3);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const labelCount = 4;
  for (let i = 0; i <= labelCount; i++) {
    const idx = Math.round((i / labelCount) * (data.length - 1));
    const x = toX(idx);
    const d = new Date(data[idx].time);
    let label;
    if (currentRange === '24h') {
      label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    ctx.fillText(label, x, h - 4);
  }

  // Area fill
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(prices[0]));
  for (let i = 1; i < prices.length; i++) {
    ctx.lineTo(toX(i), toY(prices[i]));
  }
  ctx.lineTo(toX(prices.length - 1), pad.top + plotH);
  ctx.lineTo(toX(0), pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(prices[0]));
  for (let i = 1; i < prices.length; i++) {
    ctx.lineTo(toX(i), toY(prices[i]));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Current price dot
  const lastX = toX(prices.length - 1);
  const lastY = toY(prices[prices.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
  ctx.fillStyle = isUp ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)';
  ctx.fill();
}

function formatNumber(num, decimals) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
}
