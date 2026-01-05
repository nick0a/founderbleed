# Phase 0: Project Setup & Memory Architecture

## Overview

Initialize the project, configure the development environment, and establish the memory architecture that will guide development. This phase creates the foundation for consistent, context-aware development.

**Product Name:** Founder Bleed
**Core Product Loop:** TRIAGE → DELEGATE → PLAN

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon recommended)
- Google Cloud Console access (for OAuth credentials)
- Stripe account (for later phases)

---

## Domain Context

Before building, understand these core concepts:

### The 5-Tier Classification Model

| Tier | Description | Default Rate | Who Does This Work |
|------|-------------|--------------|-------------------|
| **Unique** | Only this founder can do it (strategic vision, key relationships) | Founder's compensation | Only you |
| **Founder** | High-value work a co-founder could handle | Founder's compensation | A co-founder |
| **Senior** | Skilled specialist work (Engineering or Business) | $100,000/year | Senior hire |
| **Junior** | Entry-level specialist work | $50,000/year | Junior hire |
| **EA** | Executive Assistant / administrative | $30,000/year | EA |

**Solo Founder Rule:** If team has only 1 founder, hide "Founder" tier entirely. Events that would be "Founder" become "Unique".

### Core Metrics

| Metric | Calculation |
|--------|-------------|
| **Founder Cost** | `(Salary + Equity Value) / 2080 × Hours Worked` |
| **Delegated Cost** | `Sum of (Hours per Tier × Tier Rate)` |
| **Arbitrage** | `Founder Cost - Delegated Cost` |
| **Efficiency Score** | `(Unique + Founder Hours) / Total Hours × 100` |
| **Planning Score** | Calendar hygiene score 0-100, displayed as percentage |

### Hero Metric

The primary display is: **"{Username}, You're Losing $X Every Year..."**

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+ (App Router) |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL via Neon |
| **ORM** | Drizzle ORM |
| **Authentication** | NextAuth.js v5 |
| **Hosting** | Vercel |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Theme** | next-themes (dark/light mode) |
| **AI/LLM** | OpenAI / Anthropic / Google APIs |
| **Payments** | Stripe |
| **Email** | Resend |
| **Currency** | 12data API |

---

## Build Instructions

### 0.1 Read and Internalize Core Concepts

Before writing ANY code, understand:

1. **Core Product Loop**: TRIAGE → DELEGATE → PLAN (users audit, get hiring recs, plan better, repeat)
2. **5-Tier Model**: Unique, Founder, Senior, Junior, EA
3. **Solo Founder Exception**: Hide Founder tier when team_composition.founder === 1
4. **Hero Metric**: Frame as loss, not savings ("{Username}, You're Losing $X...")
5. **Planning Score**: Always display as percentage ("42%" not "42")

### 0.2 Initialize Project

```bash
npx create-next-app@latest founder-bleed --typescript --tailwind --eslint --app --src-dir
cd founder-bleed
```

Install core dependencies:
```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
npm install next-auth@beta @auth/drizzle-adapter
npm install next-themes
npm install stripe
npm install resend
npm install zod
```

Initialize shadcn/ui:
```bash
npx shadcn@latest init
```

Configure for dark mode support from the start.

### 0.3 Create Memory Architecture

Create the following structure:

```
.claude/
├── CLAUDE.md                    # Main project context
└── rules/
    ├── architecture.md          # Tech stack decisions
    ├── tier-classification.md   # 5-tier model rules
    ├── database-schema.md       # Schema reference
    └── critical-rules.md        # Invariants that must never be violated
```

#### CLAUDE.md Content

```markdown
# Founder Bleed

A web app that helps founders reclaim time by analyzing their calendar, classifying work by delegation tier, and generating hiring recommendations.

## Tech Stack
- Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Drizzle ORM with PostgreSQL (Neon)
- NextAuth.js v5 with Google OAuth
- Stripe for payments
- next-themes for dark/light mode

## Core Concepts
- 5-Tier Model: Unique, Founder, Senior, Junior, EA
- Core Loop: TRIAGE → DELEGATE → PLAN
- Solo founders see only 4 tiers (Founder hidden)
- Planning Score displayed as percentage

## Current Phase
Phase 0: Setup (in progress)

## Key Files
- See .claude/rules/ for detailed specifications
```

#### critical-rules.md Content

```markdown
# Critical Invariants

These rules must NEVER be violated across the entire codebase:

## 1. Never Produce NaN
- All calculations must handle null/undefined gracefully
- If salary is null, show "Set compensation to view costs" — never $0 or NaN
- Pattern: `const value = input ? Number(input) : null`

## 2. Solo Founder = 4 Tiers
- When team_composition.founder === 1, hide "Founder" tier
- Events that would be "Founder" become "Unique"
- Only show: Unique, Senior, Junior, EA

## 3. Planning Score is a Percentage
- Display as "42%" not "42"
- Always include the % symbol

## 4. Encrypt Sensitive Data
- OAuth tokens encrypted with AES-256-GCM
- Event titles and descriptions encrypted at rest
- ENCRYPTION_KEY is 32 bytes, stored in env

## 5. Algorithm Version 1.7
- Tag all audit runs with `algorithm_version: '1.7'`

## 6. Drag-Drop Requires 2+ Roles
- Hide drag handles when only 1 role recommendation
- Never show "drag tasks between roles" with single role

## 7. Share Links → Landing Page
- Shared report CTAs go to `/` not to Stripe
- Never direct share recipients to payment pages

## 8. Email-Gate Sharing
- Require email to view shared reports
- Store emails for lead capture

## 9. Reconcile Buttons, Not Checkboxes
- Triage page uses green checkmark buttons
- Not checkboxes for validation

## 10. Engineering Left, Business Right
- Team composition UI layout is consistent
- Engineering roles on left column
- Business roles on right column
- QA Engineer is in engineering column

## 11. Standardized Environment Variable Names
All Stripe price ID environment variables MUST follow this naming convention:
- Pattern: `STRIPE_PRICE_ID_{TIER}_{PERIOD}`
- Tiers: STARTER, PRO, TEAM
- Periods: MONTHLY, ANNUAL

Examples:
- ✅ `STRIPE_PRICE_ID_STARTER_MONTHLY`
- ✅ `STRIPE_PRICE_ID_PRO_ANNUAL`
- ❌ `STRIPE_PRICE_STARTER_MONTHLY` (missing _ID_)
- ❌ `STRIPE_PRICE_ID_STARTER` (missing period suffix)

This ensures all branch implementations are compatible with shared Vercel environment variables.

## 12. NextAuth Drizzle Adapter Table Names (SINGULAR)
The NextAuth Drizzle adapter requires **singular** database table names:

| Variable Name | Database Table Name | Purpose |
|---------------|---------------------|---------|
| `users` | `'user'` | User accounts |
| `accounts` | `'account'` | OAuth provider accounts |
| `sessions` | `'session'` | Database sessions |
| `verificationTokens` | `'verificationToken'` | Email verification |

Examples:
- ✅ `pgTable('user', { ... })`
- ✅ `pgTable('account', { ... })`
- ❌ `pgTable('users', { ... })` - Will cause "relation 'users' does not exist"
- ❌ `pgTable('accounts', { ... })` - OAuth sign-in will fail silently

**Note:** TypeScript variable names (e.g., `export const users`) can be plural for developer convenience, but the first argument to `pgTable()` must be singular.
```

### 0.4 Environment Configuration

**IMPORTANT: Port Assignment by LLM**

Each LLM implementation runs on a dedicated port to allow simultaneous local testing:

| LLM | Port | NEXTAUTH_URL |
|-----|------|--------------|
| **ChatGPT** | 3000 | `http://localhost:3000` |
| **Gemini** | 3001 | `http://localhost:3001` |
| **Claude** | 3002 | `http://localhost:3002` |

Update your `package.json` scripts to use your assigned port:
```json
{
  "scripts": {
    "dev": "next dev -p YOUR_PORT",
    "start": "next start -p YOUR_PORT"
  }
}
```

Create `.env.local` (using your assigned port):

```bash
# Server Configuration
PORT=YOUR_PORT  # 3000 for ChatGPT, 3001 for Gemini, 3002 for Claude

# Database
DATABASE_URL=postgresql://...

# Auth (use your assigned port!)
NEXTAUTH_URL=http://localhost:YOUR_PORT
NEXTAUTH_SECRET=  # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encryption (32 bytes for AES-256)
ENCRYPTION_KEY=  # Generate with: openssl rand -hex 32

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Stripe Price IDs (Monthly)
STRIPE_PRICE_ID_STARTER_MONTHLY=
STRIPE_PRICE_ID_PRO_MONTHLY=

# Stripe Price IDs (Annual)
STRIPE_PRICE_ID_STARTER_ANNUAL=
STRIPE_PRICE_ID_PRO_ANNUAL=

# Optional: Team tier
STRIPE_PRICE_ID_TEAM_MONTHLY=
STRIPE_PRICE_ID_TEAM_ANNUAL=

# Email
RESEND_API_KEY=
EMAIL_FROM=notifications@founderbleed.com

# External APIs
OPENAI_API_KEY=
TWELVE_DATA_API_KEY=
```

Create `.env.example` with placeholder values.

### 0.5 Database Setup

Create `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

Create initial schema structure at `src/lib/db/schema.ts` (empty for now, will be populated in Phase 1).

### 0.6 Project Structure

Create the following directory structure:

```
src/
├── app/
│   ├── api/
│   │   └── (routes will be added per phase)
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/           # shadcn components
│   └── providers/    # context providers
├── lib/
│   ├── db/
│   │   ├── index.ts  # database connection
│   │   └── schema.ts # drizzle schema
│   ├── auth.ts       # NextAuth config
│   ├── encryption.ts # AES-256 encryption
│   └── utils.ts      # utilities
└── types/
    └── index.ts      # TypeScript types
```

---

## Test Instructions

Before proceeding to Phase 1, verify all of the following. Write tests as you see fit (unit tests, integration tests, or manual verification). Each test must pass.

**Retry Policy:** If a test fails, fix the issue and retry. After 5 failed attempts on the same test, stop and ask the user for guidance.

### SETUP-01: Project Runs

**What to verify:**
- Run `npm run dev`
- Navigate to `http://localhost:YOUR_PORT` (3000/3001/3002 based on your LLM assignment)

**Success criteria:**
- No errors in terminal
- Default Next.js page loads
- No console errors in browser

### SETUP-02: Memory Architecture Exists

**What to verify:**
- Check that `.claude/CLAUDE.md` exists
- Check that `.claude/rules/` directory exists with rule files

**Success criteria:**
- CLAUDE.md contains project context
- critical-rules.md exists with all 12 invariants

### SETUP-03: Environment Configured

**What to verify:**
- `.env.local` exists with required variables
- `.env.example` exists for documentation

**Success criteria:**
- All placeholder variables are present
- No secrets committed to git (check `.gitignore`)

### SETUP-04: Database Connects

**What to verify:**
- Run a simple database query or connection test
- Drizzle can connect to Neon

**Success criteria:**
- Connection succeeds without error
- Drizzle config is valid

### SETUP-05: shadcn/ui Ready

**What to verify:**
- Run `npx shadcn@latest add button`
- Import and render a Button component

**Success criteria:**
- Component installs without error
- Button renders on page
- Tailwind styles applied correctly

### SETUP-06: Dark Mode Works

**What to verify:**
- Configure next-themes provider
- Add dark mode toggle
- Toggle between modes

**Success criteria:**
- Theme switches between light and dark
- No flash of wrong theme on load
- Preference persists

---

## Handoff Requirements

Phase 0 is complete when ALL of the following are true:

| Requirement | How to Verify |
|-------------|---------------|
| Next.js app runs | `npm run dev` succeeds, page loads |
| Memory architecture exists | `.claude/` directory with CLAUDE.md and rules |
| Critical rules documented | All 12 invariants in critical-rules.md |
| Environment configured | `.env.local` has all required variables |
| Database connects | Connection test passes |
| UI framework ready | shadcn/ui components can be added |
| Dark mode works | Theme toggle switches correctly |

**Do not proceed to Phase 1 until all tests pass and all handoff requirements are met.**

---

## Files Created This Phase

```
founder-bleed/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── architecture.md
│       ├── tier-classification.md
│       ├── database-schema.md
│       └── critical-rules.md
├── .env.local
├── .env.example
├── drizzle.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── providers/
│   │       └── theme-provider.tsx
│   └── lib/
│       └── db/
│           └── index.ts
├── components.json (shadcn config)
├── tailwind.config.ts
└── package.json
```

---

## Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| `npm run dev` fails | Missing dependencies | Run `npm install` |
| Database connection fails | Invalid DATABASE_URL | Check Neon connection string format |
| shadcn init fails | Incompatible Tailwind config | Follow shadcn setup guide for Next.js 14 |
| TypeScript errors | Strict mode issues | Adjust `tsconfig.json` if needed |
| Dark mode flickers | Hydration mismatch | Use suppressHydrationWarning on html tag |

---

## Next Phase

Once all tests pass, proceed to **Phase 1: Foundation**.
