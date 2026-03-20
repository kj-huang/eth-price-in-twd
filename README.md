# PriceScope

Chrome extension for tracking real-time prices across crypto, stocks, and forex — all in one glance.

## Features

- **Crypto**: ETH, BTC, SOL prices in TWD via Binance API
- **Stocks**: AAPL, TSMC (2330.TW), NVDA via Yahoo Finance
- **Forex**: USD/TWD, EUR/TWD, JPY/TWD via ExchangeRate API
- 24-hour and 7-day price charts per asset
- Sparkline previews in the asset list
- Toolbar badge with live crypto price indicator
- Built-in rate limiting to respect API quotas
- Auto-refreshes every 2 minutes

## Installation (Developer Mode)

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder

## Publishing to Chrome Web Store

1. **Create a developer account** at https://chrome.google.com/webstore/devconsole — one-time $5 fee
2. **Create a ZIP** of the extension:
   ```bash
   zip -r pricescope.zip manifest.json background.js lib/ popup/ icons/ -x ".*"
   ```
3. **Upload** the ZIP in the Developer Dashboard → Add new item
4. **Fill in the listing**:
   - Name: PriceScope
   - Description: Real-time price tracker for crypto, stocks, and forex
   - Category: Productivity
   - Screenshots: Take screenshots of the popup at 1280x800 or 640x400
   - Icon: Use `icons/icon128.png`
5. **Privacy practices**: Declare that the extension accesses Binance, Yahoo Finance, and ExchangeRate APIs for price data only — no user data collection
6. **Submit for review** — typically takes 1–3 business days

## APIs

| Source | Endpoint | Used For |
|--------|----------|----------|
| [Binance](https://binance-docs.github.io/apidocs/) | `/api/v3/ticker/24hr`, `/api/v3/klines` | Crypto prices & charts |
| [Yahoo Finance](https://finance.yahoo.com/) | `/v8/finance/chart/{ticker}` | Stock prices & charts |
| [ExchangeRate API](https://open.er-api.com/) | `/v6/latest/USD` | Forex rates & currency conversion |

## Architecture

```
pricescope/
├── manifest.json        Manifest V3 config
├── background.js        Service worker — fetches all asset data
├── lib/
│   ├── api.js           API modules with rate limiting
│   └── config.js        Default asset configuration
├── popup/
│   ├── popup.html       Multi-asset tabbed UI
│   ├── popup.css        Dark theme styles
│   └── popup.js         Rendering, charts, interactions
└── icons/               Extension icons (16/48/128px)
```

## License

MIT
