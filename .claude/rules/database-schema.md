# Database Schema Reference

## Overview

PostgreSQL database via Neon, using Drizzle ORM. All tables use UUID primary keys and include created_at/updated_at timestamps.

## Core Tables

### users
Primary user account table, linked to NextAuth.

```sql
users (
  id              UUID PRIMARY KEY,
  name            VARCHAR(255),
  email           VARCHAR(255) UNIQUE NOT NULL,
  email_verified  TIMESTAMP,
  image           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
)
```

### accounts (NextAuth)
OAuth account linkage for NextAuth.

```sql
accounts (
  id                  UUID PRIMARY KEY,
  user_id             UUID REFERENCES users(id),
  type                VARCHAR(255),
  provider            VARCHAR(255),
  provider_account_id VARCHAR(255),
  refresh_token       TEXT,  -- ENCRYPTED
  access_token        TEXT,  -- ENCRYPTED
  expires_at          INTEGER,
  token_type          VARCHAR(255),
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT
)
```

### profiles
Extended user data (compensation, team composition).

```sql
profiles (
  id                UUID PRIMARY KEY,
  user_id           UUID UNIQUE REFERENCES users(id),
  salary            DECIMAL(12,2),
  equity_value      DECIMAL(12,2),
  currency          VARCHAR(3) DEFAULT 'USD',
  team_composition  JSONB DEFAULT '{"founder": 1}',
  timezone          VARCHAR(50),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
)
```

### audits
Individual audit runs against calendar data.

```sql
audits (
  id                UUID PRIMARY KEY,
  user_id           UUID REFERENCES users(id),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  algorithm_version VARCHAR(10) DEFAULT '1.7',
  status            VARCHAR(20) DEFAULT 'pending',
  results           JSONB,
  created_at        TIMESTAMP DEFAULT NOW(),
  completed_at      TIMESTAMP
)
```

### events
Calendar events pulled and classified.

```sql
events (
  id                UUID PRIMARY KEY,
  audit_id          UUID REFERENCES audits(id),
  google_event_id   VARCHAR(255),
  title             TEXT,           -- ENCRYPTED
  description       TEXT,           -- ENCRYPTED
  start_time        TIMESTAMP NOT NULL,
  end_time          TIMESTAMP NOT NULL,
  duration_minutes  INTEGER,
  tier              VARCHAR(20),    -- unique, founder, senior, junior, ea
  ai_classification JSONB,
  user_override     VARCHAR(20),
  is_recurring      BOOLEAN DEFAULT FALSE,
  attendees_count   INTEGER DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW()
)
```

### subscriptions (Stripe)
User subscription status and billing.

```sql
subscriptions (
  id                    UUID PRIMARY KEY,
  user_id               UUID UNIQUE REFERENCES users(id),
  stripe_customer_id    VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan                  VARCHAR(50),    -- free, starter, team, pro
  status                VARCHAR(50),    -- active, canceled, past_due
  current_period_start  TIMESTAMP,
  current_period_end    TIMESTAMP,
  cancel_at_period_end  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
)
```

### share_links
Shareable report links with email gating.

```sql
share_links (
  id            UUID PRIMARY KEY,
  audit_id      UUID REFERENCES audits(id),
  user_id       UUID REFERENCES users(id),
  token         VARCHAR(64) UNIQUE NOT NULL,
  expires_at    TIMESTAMP,
  view_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
)
```

### share_link_views
Track who viewed shared links (email capture).

```sql
share_link_views (
  id            UUID PRIMARY KEY,
  share_link_id UUID REFERENCES share_links(id),
  email         VARCHAR(255) NOT NULL,
  viewed_at     TIMESTAMP DEFAULT NOW()
)
```

### contacts
People management for calendar context.

```sql
contacts (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  company       VARCHAR(255),
  category      VARCHAR(50),    -- investor, customer, team, vendor, other
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, email)
)
```

### planning_conversations
AI planning assistant chat history.

```sql
planning_conversations (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  title         VARCHAR(255),
  messages      JSONB DEFAULT '[]',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_events_audit_id ON events(audit_id);
CREATE INDEX idx_events_tier ON events(tier);
CREATE INDEX idx_audits_user_id ON audits(user_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_share_links_token ON share_links(token);
```

## Encryption Notes

Fields marked ENCRYPTED use AES-256-GCM encryption:
- `accounts.refresh_token`
- `accounts.access_token`
- `events.title`
- `events.description`

Encryption key stored in `ENCRYPTION_KEY` environment variable (32 bytes).
