# Phase 1: Foundation

## Overview

Build the authentication system and calendar connection infrastructure. This phase establishes the core identity and data ingestion layer that all subsequent phases depend on.

---

## Prerequisites

- Phase 0 complete (project initialized, environment configured)
- Google OAuth credentials available in Google Cloud Console
- Database connection working
- ENCRYPTION_KEY set in environment

---

## Build Instructions

### 1.1 Database Schema

Create the core tables in `src/lib/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, numeric, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  username: text('username'), // Editable display name for personalized reports
  createdAt: timestamp('created_at').defaultNow(),

  // Compensation
  salaryAnnual: numeric('salary_annual'),
  salaryInputMode: text('salary_input_mode').default('annual'), // 'annual' | 'hourly'
  companyValuation: numeric('company_valuation'),
  equityPercentage: numeric('equity_percentage'),
  vestingPeriodYears: numeric('vesting_period_years'),
  currency: text('currency').default('USD'),

  // Tier rates (annual)
  seniorEngineeringRate: numeric('senior_engineering_rate').default('100000'),
  seniorBusinessRate: numeric('senior_business_rate').default('100000'),
  juniorEngineeringRate: numeric('junior_engineering_rate').default('50000'),
  juniorBusinessRate: numeric('junior_business_rate').default('50000'),
  eaRate: numeric('ea_rate').default('30000'),

  // Settings
  settings: jsonb('settings').default({
    exclusions: ['lunch', 'gym'],
    timezone: 'UTC'
  }),

  // Team composition
  // Example: {"founder": 1, "senior_engineering": 0, "senior_business": 1, "junior_engineering": 2, "junior_business": 0, "qa_engineer": 0, "ea": 0}
  teamComposition: jsonb('team_composition').default({}),

  // Tracking
  freeAuditUsed: boolean('free_audit_used').default(false),
  qaProgress: jsonb('qa_progress').default({}),

  // Notification preferences
  notificationPreferences: jsonb('notification_preferences').default({
    email_audit_ready: true,
    email_weekly_digest: true,
    in_app_audit_ready: true
  })
});

// Calendar connections
export const calendarConnections = pgTable('calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').default('google'),
  accessToken: text('access_token').notNull(), // encrypted
  refreshToken: text('refresh_token'), // encrypted
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: text('scopes').array(),
  hasWriteAccess: boolean('has_write_access').default(false),
  connectedAt: timestamp('connected_at').defaultNow(),
  revokedAt: timestamp('revoked_at')
});
```

Run the migration:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### 1.2 Encryption Module

Create `src/lib/encryption.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not set');
  return Buffer.from(key, 'hex');
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 1.3 Authentication Setup

#### NextAuth Configuration

Create `src/lib/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        // Store encrypted tokens on first sign-in
        token.accessToken = encrypt(account.access_token!);
        token.refreshToken = account.refresh_token ? encrypt(account.refresh_token) : null;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
  },
  pages: {
    signIn: '/signin',
    error: '/error',
  },
});
```

#### OAuth Scopes

| Feature | Required Scope |
|---------|----------------|
| Initial audit | `https://www.googleapis.com/auth/calendar.readonly` |
| Planning Assistant (write) | `https://www.googleapis.com/auth/calendar.events` |

**Permissions Messaging:**
- Title: "Read-only access (for audits)"
- Description: "We never modify, create, or delete events. If you sign up for AI Planning, we'll request additional permissions then."

#### Session Management
- JWT session stored in httpOnly, secure cookie
- Session expires after 30 days of inactivity
- Contains: user_id, email
- Validated on every authenticated API request

### 1.4 Calendar Connection

Create `src/lib/google-calendar.ts`:

```typescript
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { decrypt, encrypt } from '@/lib/encryption';
import { eq } from 'drizzle-orm';

export async function getCalendarClient(userId: string) {
  // Get stored tokens for user
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, userId)
  });

  if (!connection) throw new Error('No calendar connection found');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Decrypt tokens
  const accessToken = decrypt(connection.accessToken);
  const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : null;

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiresAt?.getTime()
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await db.update(calendarConnections)
        .set({
          accessToken: encrypt(tokens.access_token),
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        })
        .where(eq(calendarConnections.userId, userId));
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function listCalendars(userId: string) {
  const calendar = await getCalendarClient(userId);
  const response = await calendar.calendarList.list();

  return response.data.items?.map(cal => ({
    id: cal.id,
    name: cal.summary,
    primary: cal.primary || false
  })) || [];
}

export async function getEvents(
  userId: string,
  calendarIds: string[],
  dateStart: string,
  dateEnd: string
) {
  const calendar = await getCalendarClient(userId);
  const allEvents = [];

  for (const calendarId of calendarIds) {
    let pageToken: string | undefined;

    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin: new Date(dateStart).toISOString(),
        timeMax: new Date(dateEnd).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
        pageToken
      });

      const events = response.data.items?.map(event => ({
        id: event.id,
        calendarId,
        title: event.summary || 'Untitled',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        isAllDay: !event.start?.dateTime,
        attendees: event.attendees?.length || 0,
        hasMeetLink: !!event.hangoutLink || !!event.conferenceData,
        isRecurring: !!event.recurringEventId,
        eventType: event.eventType // 'outOfOffice', 'focusTime', etc.
      })) || [];

      allEvents.push(...events);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  return allEvents;
}
```

### 1.5 API Routes

#### Auth Routes

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

#### Calendar List Route

Create `src/app/api/calendar/list/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listCalendars } from '@/lib/google-calendar';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const calendars = await listCalendars(session.user.id);
    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('Calendar list error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}
```

#### Calendar Events Route

Create `src/app/api/calendar/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEvents } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const calendarIds = searchParams.get('calendarIds')?.split(',') || ['primary'];
  const dateStart = searchParams.get('dateStart');
  const dateEnd = searchParams.get('dateEnd');

  if (!dateStart || !dateEnd) {
    return NextResponse.json({ error: 'dateStart and dateEnd required' }, { status: 400 });
  }

  try {
    const events = await getEvents(session.user.id, calendarIds, dateStart, dateEnd);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
```

### 1.6 Protected Route Wrapper

Create `src/components/providers/session-provider.tsx`:

```typescript
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

### 1.7 Not Found Page (Required for Next.js 14+ with React 19)

**IMPORTANT:** Create `src/app/not-found.tsx` to prevent Vercel build errors:

```typescript
// src/app/not-found.tsx
// This file is required to prevent prerendering errors with client providers
// Next.js 14+ auto-generates a /_not-found page that can fail when wrapped in client providers

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="text-primary hover:underline"
      >
        Go back home
      </a>
    </div>
  );
}
```

**Why this is required:**
- Next.js 14+ with React 19 has stricter server/client component boundaries
- The auto-generated `/_not-found` page fails during prerendering when wrapped in client providers (SessionProvider, ThemeProvider)
- This explicit not-found.tsx gives Next.js a concrete page to prerender
- Without this file, Vercel builds will fail with: `TypeError: Cannot read properties of null (reading 'useState')`

### 1.8 Middleware

Create a middleware at `src/middleware.ts`:

```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicRoute = ['/signin', '/error', '/'].some(path =>
    req.nextUrl.pathname === path
  );

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Test Instructions

Before proceeding to Phase 2, verify all of the following.

**Retry Policy:** If a test fails, fix the issue and retry. After 5 failed attempts on the same test, stop and ask the user for guidance.

### AUTH-01: OAuth Flow Completes

**What to verify:**
- Click "Sign in with Google" on sign-in page
- Complete Google consent screen
- Return to app with active session

**Success criteria:**
- No errors in console during flow
- Session contains `userId` and `email`
- Session persists across page refreshes
- User record created in database

### AUTH-02: Token Encryption

**What to verify:**
- After OAuth, check the `calendar_connections` table directly
- Query: `SELECT access_token, refresh_token FROM calendar_connections`

**Success criteria:**
- `accessToken` field is NOT a recognizable Google token (doesn't start with `ya29.`)
- Tokens are encrypted format: `iv:authTag:encrypted`
- Decrypting with encryption.ts returns valid token
- API calls using decrypted tokens succeed

### AUTH-03: Session Protection

**What to verify:**
- Access `/api/calendar/list` without logging in
- Access `/api/calendar/list` with an expired/invalid session

**Success criteria:**
- Returns 401 Unauthorized for missing session
- Returns 401 for invalid sessions
- Response includes `{ error: "unauthorized" }`

### AUTH-04: Permissions Messaging

**What to verify:**
- Start OAuth flow
- Check what scope is requested

**Success criteria:**
- Only `calendar.readonly` scope requested initially
- No write permissions requested

### CAL-01: Calendar List Returns Data

**What to verify:**
- Authenticated user calls `GET /api/calendar/list`
- Check response structure

**Success criteria:**
- Returns 200 status
- Response contains `calendars` array
- Each calendar has `id`, `name`, `primary` fields
- At least one calendar exists (user's primary)

### CAL-02: Event Fetching Works

**What to verify:**
- Call `GET /api/calendar/events?calendarIds=primary&dateStart=2025-01-01&dateEnd=2025-01-31`
- Check response

**Success criteria:**
- Returns 200 status
- Response contains `events` array
- Each event has: `id`, `title`, `start`, `end`
- Events fall within the requested date range

### CAL-03: Token Refresh Handles Expiry

**What to verify:**
- Wait for access token to expire (or mock expiry)
- Make an API call that requires the token

**Success criteria:**
- Token is automatically refreshed using refresh token
- New access token is encrypted and stored
- API call succeeds without user intervention
- User doesn't see any error

---

## Handoff Requirements

Phase 1 is complete when ALL of the following are true:

| Requirement | How to Verify |
|-------------|---------------|
| User can sign in with Google | Complete OAuth flow |
| Session persists | Refresh page, session still active |
| User record created | Check users table |
| Tokens are encrypted at rest | Query database, tokens are encrypted format |
| Calendar list API works | `GET /api/calendar/list` returns calendars |
| Event fetching API works | `GET /api/calendar/events` returns events |
| Unauthorized access blocked | API returns 401 without valid session |
| Token refresh works | Expired tokens auto-refresh |

**Do not proceed to Phase 2 until all tests pass and all handoff requirements are met.**

---

## Files Created This Phase

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── calendar/
│   │       ├── list/route.ts
│   │       └── events/route.ts
│   ├── (auth)/
│   │   └── signin/page.tsx
│   ├── not-found.tsx          # REQUIRED - prevents Vercel prerender errors
│   └── layout.tsx (updated with SessionProvider)
├── lib/
│   ├── auth.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── encryption.ts
│   └── google-calendar.ts
├── components/
│   └── providers/
│       └── session-provider.tsx
└── middleware.ts
```

---

## Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| OAuth redirect mismatch | Callback URL not configured in Google Console | Add `http://localhost:3000/api/auth/callback/google` to authorized redirects |
| Token encryption fails | Missing `ENCRYPTION_KEY` env var | Generate 32-byte hex key: `openssl rand -hex 32` |
| Calendar API 403 | Insufficient scopes | Ensure `calendar.readonly` scope is requested in OAuth config |
| Events empty for date range | Calendar has no events | Use a test calendar with known events |
| Refresh token missing | Didn't request offline access | Add `access_type: 'offline'` to OAuth params |
| Session not persisting | Cookie configuration | Check NEXTAUTH_URL matches your domain |
| **Vercel build fails: `useState` is null** | Missing not-found.tsx with client providers | Create `src/app/not-found.tsx` (see section 1.7) - REQUIRED for Next.js 14+ with React 19 |

---

## Next Phase

Once all tests pass, proceed to **Phase 2: Audit Engine**.
