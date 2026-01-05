# Database Schema Reference

## Overview

Database is PostgreSQL hosted on Neon, accessed via Drizzle ORM.

## Core Tables

### users
Primary user account table, linked to NextAuth.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Display name |
| email | text | Unique, indexed |
| email_verified | timestamp | Email verification date |
| image | text | Avatar URL |
| created_at | timestamp | Account creation |
| updated_at | timestamp | Last update |

### accounts
OAuth account connections (NextAuth adapter).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK → users |
| type | text | 'oauth' |
| provider | text | 'google' |
| provider_account_id | text | External ID |
| access_token | text | **Encrypted** |
| refresh_token | text | **Encrypted** |
| expires_at | integer | Token expiry |
| scope | text | OAuth scopes |

### user_profiles
Extended user data for the app.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK → users |
| salary | integer | Annual salary (nullable) |
| equity_value | integer | Equity value (nullable) |
| currency | text | Default 'USD' |
| team_composition | jsonb | { founder: number, ... } |
| subscription_tier | text | 'free', 'starter', 'pro', 'enterprise' |
| subscription_status | text | 'active', 'canceled', etc. |

### audits
Calendar audit runs.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK → users |
| algorithm_version | text | Always '1.7' |
| start_date | date | Audit period start |
| end_date | date | Audit period end |
| status | text | 'pending', 'completed', 'failed' |
| created_at | timestamp | Audit creation |

### events
Individual calendar events (encrypted).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| audit_id | uuid | FK → audits |
| google_event_id | text | External reference |
| title | text | **Encrypted** |
| description | text | **Encrypted** |
| start_time | timestamp | Event start |
| end_time | timestamp | Event end |
| duration_minutes | integer | Calculated duration |
| tier | text | Unique/Founder/Senior/Junior/EA |
| vertical | text | Universal/Technical/Business |
| is_reconciled | boolean | User verified |

### subscriptions
Stripe subscription data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK → users |
| stripe_customer_id | text | Stripe reference |
| stripe_subscription_id | text | Stripe reference |
| price_id | text | Stripe price ID |
| status | text | Subscription status |
| current_period_end | timestamp | Billing period end |

## Encryption Rules

The following fields MUST be encrypted at rest using AES-256-GCM:
- `accounts.access_token`
- `accounts.refresh_token`
- `events.title`
- `events.description`

## Indexing Strategy

- `users.email` - Unique index
- `accounts.user_id` - Foreign key index
- `audits.user_id` - Foreign key index
- `events.audit_id` - Foreign key index
- `events.tier` - For aggregation queries
- `subscriptions.user_id` - Foreign key index
- `subscriptions.stripe_customer_id` - Lookup index