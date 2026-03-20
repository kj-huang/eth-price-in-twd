# ETH Price in TWD

Chrome extension that displays real-time Ethereum price in New Taiwan Dollar (TWD) with an interactive price chart.

## Features

- Real-time ETH/TWD price from Binance + ExchangeRate API
- 24-hour and 7-day price chart
- 24h high/low, volume, and USD/TWD exchange rate
- Toolbar badge showing current price with green/red indicator
- Auto-refreshes every minute

## Installation

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder

## APIs

- [Binance API](https://binance-docs.github.io/apidocs/) - ETH/USDT ticker and kline data
- [ExchangeRate API](https://open.er-api.com/) - USD to TWD conversion

## Tech

- Chrome Extension Manifest V3
- Service worker for background data fetching
- Canvas-based chart rendering (no external libraries)
