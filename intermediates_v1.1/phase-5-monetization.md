# Phase 5: Monetization

## Overview

Build the subscription system with Stripe integration, feature gating, and email-gated report sharing. This phase enables revenue generation and viral distribution.

---

## Prerequisites

- Phase 4 complete (onboarding and triage working)
- Full audit flow functional end-to-end
- Stripe account with API keys configured

---

## Subscription Tiers

| Tier | Price | LLM Budget | Support |
|------|-------|------------|---------|
| **Free** | $0 | None | - |
| **Starter** | $20/seat/month | $3.00/month | Community |
| **Pro** | $50/seat/month | $7.50/month | Email (48hr) |
| **Enterprise** | $90/seat/month | $13.50/month | Email (8hr) |

### Annual Discount
2 months free (pay for 10, get 12):
- Starter: $200/year
- Pro: $500/year
- Enterprise: $900/year

---

## Free Tier Limits

| Feature | Free | Paid |
|---------|------|------|
| Audits | 1 total (ever) | Unlimited |
| View results | Yes | Yes |
| Share report | Yes (email-gated) | Yes |
| Planning Assistant | No | Yes |
| Automated audits | No | Yes |
| Comparison views | No | Yes |
| Dashboard | Limited | Full |

---

## Database Schema

```typescript
// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  tier: text('tier'), // 'starter', 'pro', 'enterprise'
  status: text('status'), // 'active', 'cancelled', 'past_due', 'trialing'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  llmBudgetCents: integer('llm_budget_cents'), // monthly budget
  llmSpentCents: integer('llm_spent_cents').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  cancelledAt: timestamp('cancelled_at')
});

// BYOK Keys
export const byokKeys = pgTable('byok_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider'), // 'openai', 'anthropic', 'google'
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  priority: text('priority').default('budget_first'), // 'byok_first', 'budget_first', 'byok_premium_only'
  createdAt: timestamp('created_at').defaultNow()
});

// Shared reports (email-gated)
export const sharedReports = pgTable('shared_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // 30 days from creation
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  revokedAt: timestamp('revoked_at')
});

// Report access log (lead capture)
export const reportAccessLog = pgTable('report_access_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  sharedReportId: uuid('shared_report_id').references(() => sharedReports.id, { onDelete: 'cascade' }),
  viewerEmail: text('viewer_email').notNull(),
  emailVerified: boolean('email_verified').default(false),
  verificationToken: text('verification_token'),
  accessedAt: timestamp('accessed_at').defaultNow(),
  convertedToSignup: boolean('converted_to_signup').default(false)
});
```

---

## Stripe Integration

### API Endpoints

```
/app/api/subscription/
├── create-checkout/route.ts    # POST - Create Stripe checkout session
├── webhook/route.ts            # POST - Handle Stripe webhooks
├── portal/route.ts             # GET - Get customer portal URL
└── status/route.ts             # GET - Get current subscription status
```

### Checkout Session

```typescript
// POST /api/subscription/create-checkout
export async function POST(request: NextRequest) {
  const session = await auth();
  const { tier, billingPeriod } = await request.json();

  const priceId = billingPeriod === 'annual'
    ? STRIPE_ANNUAL_PRICES[tier]
    : STRIPE_MONTHLY_PRICES[tier];

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/results?cancelled=true`,
    metadata: { userId: session.user.id }
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
```

### Webhook Handler

Handle these Stripe events:
- `checkout.session.completed` → Activate subscription
- `customer.subscription.updated` → Update tier/status
- `customer.subscription.deleted` → Deactivate
- `invoice.payment_failed` → Mark as past_due

---

## Feature Gating

### Middleware

Create `src/lib/subscription.ts`:

```typescript
export async function requireSubscription(userId: string, minTier?: 'starter' | 'pro' | 'enterprise') {
  const subscription = await getActiveSubscription(userId);

  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, reason: 'subscription_required' };
  }

  if (minTier) {
    const tierOrder = { starter: 1, pro: 2, enterprise: 3 };
    if (tierOrder[subscription.tier] < tierOrder[minTier]) {
      return { allowed: false, reason: 'upgrade_required' };
    }
  }

  return { allowed: true };
}

export async function requireAuditQuota(userId: string) {
  const user = await getUser(userId);
  const subscription = await getActiveSubscription(userId);

  if (user.freeAuditUsed && !subscription) {
    return { allowed: false, reason: 'free_audit_used' };
  }

  return { allowed: true };
}
```

### Paywall Modal

When gated feature accessed, show modal with:
- Current plan vs required plan
- Feature comparison
- Subscribe CTA
- "Maybe later" dismiss

---

## Email-Gated Sharing

### Share Flow

```
1. User clicks "Share Report"
2. System generates secure token (32+ chars)
3. User gets shareable URL: /share/[token]
4. Visitor clicks link
5. Email capture modal appears
6. Visitor enters email
7. System sends verification email
8. Visitor clicks verification link
9. Report becomes visible
10. Email stored as lead
```

### Shared Report Content

| Data Element | Visible |
|--------------|---------|
| Summary metrics | Yes |
| Planning Score | Yes |
| Time breakdown by tier | Yes |
| Role recommendations | Yes |
| Job descriptions | Yes |
| Event table | Yes |
| **Personal compensation** | **HIDDEN** |
| **Salary/equity details** | **HIDDEN** |
| Edit capabilities | No (view only) |

### CTA on Shared Report

**CRITICAL:** "Get your own audit" → links to landing page `/`

**NEVER:** Direct link to Stripe checkout

---

## BYOK (Bring Your Own Key)

### Supported Providers
- OpenAI (platform.openai.com)
- Anthropic (console.anthropic.com)
- Google (aistudio.google.com)

### Priority Settings

| Setting | Behavior |
|---------|----------|
| BYOK First | Always use BYOK; never touch budget |
| Budget First | Use budget until exhausted, then BYOK |
| BYOK for Premium Only | Use budget for cheap; BYOK for Opus/GPT-5 |

### Key Validation
- Test key on save before storing
- Encrypt with AES-256 before storage
- Never show full key in UI after save

---

## Test Instructions

**Retry Policy:** If a test fails, fix and retry. After 5 failed attempts, ask the user.

### MONEY-01: Checkout Creates Session

**What to verify:**
- Call `POST /api/subscription/create-checkout` with tier "starter"

**Success criteria:**
- Returns 200 with `checkoutUrl`
- URL starts with `https://checkout.stripe.com`

### MONEY-02: Webhook Activates Subscription

**What to verify:**
- Complete test checkout (Stripe test mode)

**Success criteria:**
- Webhook receives event
- Subscription created in database
- Status is "active"

### MONEY-03: Free User Blocked from Second Audit

**What to verify:**
- Free user creates first audit (succeeds)
- Free user tries second audit

**Success criteria:**
- First: 200 OK
- Second: 403 with `free_audit_used`
- UI shows upgrade prompt

### MONEY-04: Free User Blocked from Planning

**What to verify:**
- Free user accesses Planning Assistant

**Success criteria:**
- Returns 403
- Paywall modal appears

### MONEY-05: Subscriber Accesses Planning

**What to verify:**
- Subscribed user accesses Planning Assistant

**Success criteria:**
- Returns 200
- Chat interface loads

### MONEY-06: Share Link Requires Email

**What to verify:**
- Generate share link
- Open in incognito browser

**Success criteria:**
- Email capture modal appears
- Cannot view without email
- After verification, report displays

### MONEY-07: Shared Report Hides Salary

**What to verify:**
- View shared report

**Success criteria:**
- Efficiency Score visible
- Role recommendations visible
- Salary NOT visible
- Equity NOT visible
- CTA points to `/` not Stripe

### MONEY-08: BYOK Key Encrypted

**What to verify:**
- Save a BYOK API key

**Success criteria:**
- Key saved
- Database has encrypted value (not plaintext)
- Key validation occurs on save

### MONEY-09: Customer Portal Works

**What to verify:**
- Subscriber requests portal link

**Success criteria:**
- Returns valid Stripe portal URL
- Portal opens and shows subscription

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Checkout works | Creates Stripe session |
| Webhooks process | Subscription activated after payment |
| Free audit limit | Second audit blocked |
| Planning gated | Free users see paywall |
| Subscribers access Planning | No paywall |
| Share requires email | Must enter email to view |
| Shared reports hide salary | Sensitive data not exposed |
| CTA → landing page | Not to Stripe |
| BYOK works | Keys save encrypted |
| Portal works | Subscribers can manage billing |

**Do not proceed to Phase 6 until all tests pass.**

---

## Next Phase

Once all tests pass, proceed to **Phase 6: Landing Page**.
