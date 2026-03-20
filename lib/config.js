// Default asset configuration
export const DEFAULT_ASSETS = {
  crypto: [
    { id: 'eth-twd', name: 'ETH/TWD', base: 'ETH', binanceSymbol: 'ETHUSDT' },
    { id: 'btc-twd', name: 'BTC/TWD', base: 'BTC', binanceSymbol: 'BTCUSDT' },
    { id: 'sol-twd', name: 'SOL/TWD', base: 'SOL', binanceSymbol: 'SOLUSDT' },
  ],
  stocks: [
    { id: 'aapl', name: 'Apple', ticker: 'AAPL', currency: 'USD' },
    { id: 'tsmc', name: 'TSMC', ticker: '2330.TW', currency: 'TWD' },
    { id: 'nvda', name: 'NVIDIA', ticker: 'NVDA', currency: 'USD' },
  ],
  forex: [
    { id: 'usd-twd', name: 'USD/TWD', base: 'USD', quote: 'TWD' },
    { id: 'eur-twd', name: 'EUR/TWD', base: 'EUR', quote: 'TWD' },
    { id: 'jpy-twd', name: 'JPY/TWD', base: 'JPY', quote: 'TWD' },
  ],
};

export const CATEGORIES = [
  { key: 'crypto', label: 'Crypto', icon: '◈' },
  { key: 'stocks', label: 'Stocks', icon: '◉' },
  { key: 'forex', label: 'Forex', icon: '⇄' },
];
