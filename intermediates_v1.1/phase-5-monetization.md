# Phase 5: Monetization

## Overview

Build the subscription system with Stripe integration, feature gating, and email-gated report sharing. This phase enables revenue generation and viral distribution.

---

## Prerequisites

- Phase 4 complete (onboarding and triage working)
- Full audit flow functional end-to-end
- Stripe account with API keys configured

---

## Integration References

Before implementing the email-gated sharing features in this phase, review:

- **[integration-resend.md](./integration-resend.md)** - Complete Resend email integration guide including verification email templates, batch sending, and lead capture implementation.

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
    ? process.env[`STRIPE_PRICE_ID_${tier.toUpperCase()}_ANNUAL`]
    : process.env[`STRIPE_PRICE_ID_${tier.toUpperCase()}_MONTHLY`];

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

## Sharing Options

### Option 1: Direct Email Sharing (from Results Page)

Users can send their report directly to colleagues from the results page:

```
1. User finds "Share Your Results" section on results page
2. User types email address and presses Space (creates tag)
3. User repeats to add multiple recipients
4. User presses Enter to send
5. System generates secure share token (if not exists)
6. System sends email to each recipient via Resend
7. Email contains link to /share/[token]
8. Recipients' emails stored as leads
9. Success toast: "Report sent to X recipients"
```

### Option 2: Social Media Sharing

Users can share via social platforms:
- **LinkedIn:** Opens share dialog with pre-populated audit summary
- **Twitter/X:** Opens tweet composer with hero metric
- **Copy Link:** Copies shareable URL to clipboard

### Option 3: Manual Link Sharing

Users can copy the share link and distribute manually.

### Email-Gated Viewing (for Recipients)

When anyone visits a shared report link:

```
1. Visitor clicks shared link
2. Email capture modal appears
3. Visitor enters email
4. System sends verification email
5. Visitor clicks verification link
6. Report becomes visible
7. Email stored as lead
```

**Note:** This applies to ALL shared links, regardless of how they were distributed.

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

### MONEY-06: Direct Email Sharing Works

**What to verify:**
- Go to results page
- Enter emails in the share input (press Space after each)
- Press Enter to send

**Success criteria:**
- Emails become tags when Space is pressed
- Enter sends report to all recipients
- Recipients receive email with share link
- Success toast shows recipient count

### MONEY-07: Social Share Links Work

**What to verify:**
- Click LinkedIn share button
- Click Twitter/X share button
- Click Copy Link button

**Success criteria:**
- LinkedIn opens with pre-populated content
- Twitter opens with hero metric in tweet
- Copy Link copies URL and shows toast
- All links point to /share/[token]

### MONEY-08: Share Link Requires Email (Recipients)

**What to verify:**
- Open share link in incognito browser

**Success criteria:**
- Email capture modal appears
- Cannot view without email
- After verification, report displays

### MONEY-09: Shared Report Hides Salary

**What to verify:**
- View shared report

**Success criteria:**
- Efficiency Score visible
- Role recommendations visible
- Salary NOT visible
- Equity NOT visible
- CTA points to `/` not Stripe

### MONEY-10: BYOK Key Encrypted

**What to verify:**
- Save a BYOK API key

**Success criteria:**
- Key saved
- Database has encrypted value (not plaintext)
- Key validation occurs on save

### MONEY-11: Customer Portal Works

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
| Direct email sharing | Space adds tags, Enter sends |
| Social share links | LinkedIn, Twitter/X, Copy Link work |
| Share link requires email | Recipients must verify email |
| Shared reports hide salary | Sensitive data not exposed |
| CTA → landing page | Not to Stripe |
| BYOK works | Keys save encrypted |
| Portal works | Subscribers can manage billing |

**Do not proceed to Phase 6 until all tests pass.**

---

## User Review & Verification

**⏸️ STOP: User review required before proceeding to the next phase.**

The agent has completed this phase. Before continuing, please verify the build yourself.

### Manual Testing Checklist

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Free audit limit | As a free user, try to run a second audit | Shows "Free audit used" message, prompts to upgrade |
| 2 | Stripe checkout | Click Subscribe, select a plan | Redirects to Stripe checkout page |
| 3 | Subscription activates | Complete Stripe test payment | Dashboard becomes accessible, subscription active |
| 4 | Planning gated | As free user, try to access Planning Assistant | Paywall modal appears |
| 5 | Direct email sharing | On results page, add emails (Space), send (Enter) | Emails become tags, recipients receive share email |
| 6 | Social share links | Click LinkedIn, Twitter/X, Copy Link buttons | Opens share dialogs, copy shows toast |
| 7 | Share link requires email | Open share link in incognito | Must enter email before viewing report |
| 8 | Shared report hides salary | View a shared report | Efficiency score visible, but NO salary/equity shown |
| 9 | Share CTA goes to landing | On shared report, click the main CTA | Goes to `/` (landing page), NOT to Stripe |

### What to Look For

- Stripe test mode payments complete successfully
- Webhook updates subscription status in database
- Free users see upgrade prompts at appropriate places
- Subscriber features unlock after payment

### Known Limitations at This Stage

- Using Stripe test mode (not real payments)
- BYOK key validation may need API keys to test
- Email verification for shares requires email service configured

### Proceed to Next Phase

Once you've verified the above, instruct the agent:

> "All Phase 5 tests pass. Proceed to Phase 6: Landing Page."

If issues were found:

> "Phase 5 issue: [describe problem]. Please fix before proceeding."

---

## Next Phase

Once all tests pass, proceed to **Phase 6: Landing Page**.
