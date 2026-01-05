# Twelve Data Currency Exchange Integration Guide

## Overview

This document provides complete implementation instructions for integrating Twelve Data's currency exchange API into the Founder Bleed application. The integration is used for:
- Converting salary/compensation values between currencies
- Displaying costs in user's preferred currency
- Converting tier rates for international users

---

## Prerequisites

- Twelve Data API key from [Twelve Data Dashboard](https://twelvedata.com/account/api-keys)
- Basic tier or higher (free tier available with rate limits)

---

## Environment Variables

```bash
# .env.local
TWELVE_DATA_API_KEY=a2a3c05c218a4ea3a005693e24289284
```

---

## API Overview

### Base URL
```
https://api.twelvedata.com
```

### Authentication Methods

1. **Query Parameter** (simple):
   ```
   ?apikey=your_api_key
   ```

2. **HTTP Header** (recommended for security):
   ```
   Authorization: apikey your_api_key
   ```

### Demo Key
For testing: `apikey=demo` (limited functionality)

**Source:** [Twelve Data API Documentation](https://twelvedata.com/docs)

---

## Relevant Endpoints

### 1. Exchange Rate

Get real-time exchange rate between two currencies.

**Endpoint:** `GET /exchange_rate`

**Cost:** 1 API credit per request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes* | Currency pair (e.g., `EUR/USD`) |
| `base` | string | Yes* | Base currency code (e.g., `USD`) |
| `quote` | string | Yes* | Quote currency code (e.g., `EUR`) |

*Use either `symbol` OR `base`+`quote`

**Example Request:**
```
GET https://api.twelvedata.com/exchange_rate?symbol=EUR/USD&apikey=your_api_key
```

**Response:**
```json
{
  "symbol": "EUR/USD",
  "rate": 1.08234,
  "timestamp": 1704844800
}
```

### 2. Currency Conversion

Convert an amount between currencies.

**Endpoint:** `GET /currency_conversion`

**Cost:** 1 API credit per request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | Currency pair (e.g., `EUR/USD`) |
| `amount` | number | Yes | Amount to convert |

**Example Request:**
```
GET https://api.twelvedata.com/currency_conversion?symbol=USD/GBP&amount=100&apikey=your_api_key
```

**Response:**
```json
{
  "symbol": "USD/GBP",
  "rate": 0.78543,
  "amount": 100,
  "timestamp": 1704844800
}
```

### 3. Forex Pairs List

Get all available currency pairs.

**Endpoint:** `GET /forex_pairs`

**Example Request:**
```
GET https://api.twelvedata.com/forex_pairs?apikey=your_api_key
```

**Response:**
```json
{
  "data": [
    {
      "symbol": "EUR/USD",
      "currency_group": "Major",
      "currency_base": "Euro",
      "currency_quote": "US Dollar"
    },
    ...
  ]
}
```

**Source:** [Twelve Data Forex Documentation](https://twelvedata.com/forex)

---

## Implementation

### Currency Service

Create `src/lib/currency.ts`:

```typescript
import { unstable_cache } from 'next/cache';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const API_KEY = process.env.TWELVE_DATA_API_KEY;

if (!API_KEY) {
  console.warn('TWELVE_DATA_API_KEY not set - currency conversion disabled');
}

export interface ExchangeRateResponse {
  symbol: string;
  rate: number;
  timestamp: number;
}

export interface CurrencyConversionResponse {
  symbol: string;
  rate: number;
  amount: number;
  timestamp: number;
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  baseCurrency: string,
  quoteCurrency: string
): Promise<number | null> {
  if (!API_KEY) {
    console.warn('No API key - returning null');
    return null;
  }

  // Same currency - no conversion needed
  if (baseCurrency.toUpperCase() === quoteCurrency.toUpperCase()) {
    return 1;
  }

  try {
    const symbol = `${baseCurrency}/${quoteCurrency}`;
    const url = new URL(`${TWELVE_DATA_BASE_URL}/exchange_rate`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', API_KEY);

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error('Twelve Data API error:', response.status, response.statusText);
      return null;
    }

    const data: ExchangeRateResponse = await response.json();

    if (!data.rate) {
      console.error('Invalid response from Twelve Data:', data);
      return null;
    }

    return data.rate;
  } catch (error) {
    console.error('Currency exchange rate fetch failed:', error);
    return null;
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (!API_KEY) {
    console.warn('No API key - returning original amount');
    return amount;
  }

  // Same currency - no conversion needed
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  try {
    const rate = await getExchangeRate(fromCurrency, toCurrency);

    if (rate === null) {
      return null;
    }

    return amount * rate;
  } catch (error) {
    console.error('Currency conversion failed:', error);
    return null;
  }
}

/**
 * Cached version of getExchangeRate for frequently accessed pairs
 */
export const getCachedExchangeRate = unstable_cache(
  async (baseCurrency: string, quoteCurrency: string) => {
    return getExchangeRate(baseCurrency, quoteCurrency);
  },
  ['exchange-rate'],
  {
    revalidate: 3600, // 1 hour
    tags: ['currency'],
  }
);
```

---

### Currency Conversion Utilities

Create `src/lib/currency-utils.ts`:

```typescript
import { getExchangeRate, convertCurrency } from './currency';

// Supported currencies with display info
export const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Format amount in specified currency
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'USD'
): string {
  const config = SUPPORTED_CURRENCIES[currency];

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert and format amount for display
 */
export async function convertAndFormat(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<string> {
  const converted = await convertCurrency(amount, fromCurrency, toCurrency);

  if (converted === null) {
    // Fallback: show original amount with note
    return `${formatCurrency(amount, fromCurrency)} (${fromCurrency})`;
  }

  return formatCurrency(converted, toCurrency);
}

/**
 * Convert tier rates to user's currency
 */
export async function convertTierRates(
  rates: {
    seniorEngineeringRate: number;
    seniorBusinessRate: number;
    juniorEngineeringRate: number;
    juniorBusinessRate: number;
    eaRate: number;
  },
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<typeof rates | null> {
  if (fromCurrency === toCurrency) {
    return rates;
  }

  const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);

  if (exchangeRate === null) {
    return null;
  }

  return {
    seniorEngineeringRate: Math.round(rates.seniorEngineeringRate * exchangeRate),
    seniorBusinessRate: Math.round(rates.seniorBusinessRate * exchangeRate),
    juniorEngineeringRate: Math.round(rates.juniorEngineeringRate * exchangeRate),
    juniorBusinessRate: Math.round(rates.juniorBusinessRate * exchangeRate),
    eaRate: Math.round(rates.eaRate * exchangeRate),
  };
}
```

---

### API Route for Currency Conversion

Create `src/app/api/currency/convert/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { convertCurrency } from '@/lib/currency';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const amount = parseFloat(searchParams.get('amount') || '0');
  const from = searchParams.get('from')?.toUpperCase() || 'USD';
  const to = searchParams.get('to')?.toUpperCase() || 'USD';

  if (isNaN(amount) || amount < 0) {
    return NextResponse.json(
      { error: 'Invalid amount' },
      { status: 400 }
    );
  }

  try {
    const converted = await convertCurrency(amount, from, to);

    if (converted === null) {
      return NextResponse.json(
        { error: 'Conversion failed', originalAmount: amount, currency: from },
        { status: 503 }
      );
    }

    return NextResponse.json({
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount: converted,
      convertedCurrency: to,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Rate Caching Strategy

For production, implement aggressive caching to minimize API calls:

```typescript
// src/lib/currency-cache.ts
import { Redis } from '@upstash/redis'; // Or use in-memory Map

// Simple in-memory cache for development
const exchangeRateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCachedRate(
  baseCurrency: string,
  quoteCurrency: string
): Promise<number | null> {
  const cacheKey = `${baseCurrency}/${quoteCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rate;
  }

  // Fetch fresh rate
  const rate = await getExchangeRate(baseCurrency, quoteCurrency);

  if (rate !== null) {
    exchangeRateCache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
    });
  }

  return rate;
}

// Pre-warm cache with common currency pairs
export async function warmCache(): Promise<void> {
  const commonPairs = [
    ['USD', 'EUR'],
    ['USD', 'GBP'],
    ['USD', 'CAD'],
    ['USD', 'AUD'],
    ['EUR', 'GBP'],
  ];

  await Promise.all(
    commonPairs.map(([base, quote]) => getCachedRate(base, quote))
  );
}
```

---

### Usage in Components

#### Currency Selector Component

Create `src/components/settings/currency-selector.tsx`:

```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_CURRENCIES, SupportedCurrency } from '@/lib/currency-utils';

interface CurrencySelectorProps {
  value: SupportedCurrency;
  onValueChange: (value: SupportedCurrency) => void;
  disabled?: boolean;
}

export function CurrencySelector({ value, onValueChange, disabled }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
          <SelectItem key={code} value={code}>
            {info.symbol} {code} - {info.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### Display Converted Salary

```typescript
import { convertCurrency, formatCurrency } from '@/lib/currency-utils';

async function SalaryDisplay({
  salaryAnnual,
  baseCurrency,
  displayCurrency,
}: {
  salaryAnnual: number;
  baseCurrency: string;
  displayCurrency: string;
}) {
  const converted = await convertCurrency(salaryAnnual, baseCurrency, displayCurrency);

  if (converted === null) {
    // Fallback to original currency
    return <span>{formatCurrency(salaryAnnual, baseCurrency)}</span>;
  }

  return <span>{formatCurrency(converted, displayCurrency)}</span>;
}
```

---

### Error Handling & Fallbacks

```typescript
import { getExchangeRate } from '@/lib/currency';

// Fallback rates for when API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  'USD/EUR': 0.92,
  'USD/GBP': 0.79,
  'USD/CAD': 1.35,
  'USD/AUD': 1.53,
  'USD/JPY': 148.50,
  'EUR/USD': 1.09,
  'GBP/USD': 1.27,
};

export async function getExchangeRateWithFallback(
  baseCurrency: string,
  quoteCurrency: string
): Promise<number> {
  // Try API first
  const rate = await getExchangeRate(baseCurrency, quoteCurrency);

  if (rate !== null) {
    return rate;
  }

  // Check fallback rates
  const directKey = `${baseCurrency}/${quoteCurrency}`;
  if (FALLBACK_RATES[directKey]) {
    console.warn(`Using fallback rate for ${directKey}`);
    return FALLBACK_RATES[directKey];
  }

  // Check inverse
  const inverseKey = `${quoteCurrency}/${baseCurrency}`;
  if (FALLBACK_RATES[inverseKey]) {
    console.warn(`Using inverse fallback rate for ${directKey}`);
    return 1 / FALLBACK_RATES[inverseKey];
  }

  // Last resort: return 1 (no conversion)
  console.error(`No rate available for ${directKey}, returning 1`);
  return 1;
}
```

---

## API Limits & Rate Limiting

### Free Tier Limits
- 800 API credits/day
- 8 API calls/minute

### Recommended Practices
1. **Cache aggressively** - Exchange rates don't change frequently
2. **Pre-warm cache** on server startup
3. **Use fallback rates** when API is unavailable
4. **Batch requests** where possible

### Rate Limit Handling

```typescript
async function fetchWithRetry(
  url: string,
  retries: number = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);

    if (response.status === 429) {
      // Rate limited - wait and retry
      const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
      console.warn(`Rate limited, waiting ${waitTime}ms before retry`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

**Source:** [Twelve Data API Documentation](https://twelvedata.com/docs)

---

## Testing

### Mock API for Development

Create `src/lib/__mocks__/currency.ts`:

```typescript
// Mock implementation for testing
export async function getExchangeRate(
  baseCurrency: string,
  quoteCurrency: string
): Promise<number | null> {
  const mockRates: Record<string, number> = {
    'USD/EUR': 0.92,
    'USD/GBP': 0.79,
    'EUR/USD': 1.09,
    'GBP/USD': 1.27,
  };

  const key = `${baseCurrency}/${quoteCurrency}`;
  return mockRates[key] || null;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return rate ? amount * rate : null;
}
```

### Test with Demo Key

```typescript
// Quick test
const testRate = await fetch(
  'https://api.twelvedata.com/exchange_rate?symbol=EUR/USD&apikey=demo'
).then(r => r.json());

console.log('Demo API response:', testRate);
```

---

## Integration Points in Founder Bleed

### 1. Onboarding (Phase 4)
- User selects currency during onboarding
- Convert default tier rates to user's currency

### 2. Settings (Phase 9)
- Currency selector in compensation section
- Convert and display rates in selected currency

### 3. Results (Phase 3)
- Display arbitrage in user's currency
- Convert role recommendation costs

### 4. Shared Reports (Phase 5)
- Show costs in report owner's currency
- Optionally allow viewer to see in their currency

---

## Sources

- [Twelve Data API Documentation](https://twelvedata.com/docs)
- [Twelve Data Forex API](https://twelvedata.com/forex)
- [Twelve Data Currency Pairs](https://twelvedata.com/exchanges/physical_currency)
- [Twelve Data Request Builder](https://twelvedata.com/request-builder)
- [Twelve Data NPM Package](https://www.npmjs.com/package/twelvedata)
