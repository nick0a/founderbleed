# Founder Bleed MVP - Build Phases (v1.1)

**Self-contained build instructions.** Each phase document includes all necessary specifications - no external PRD reference required.

---

## How to Use These Documents

### Auto-Continuation Mode

**IMPORTANT:** Once you begin Phase 0, you must automatically continue through ALL phases (0 → 10) without waiting for user input. The build is complete only when Phase 10 passes all tests.

**Execution Flow:**
1. Complete current phase (implement + pass all tests)
2. Immediately read and execute the next phase document
3. Repeat until Phase 10 is complete
4. Only stop for user intervention if required (see Retry Policy below)

### For Each Phase:

1. **Read the phase document** — Contains all specifications needed
2. **Implement the features** — Follow build instructions
3. **Run ALL tests for this phase** — Each phase has numbered tests (e.g., AUTH-01, AUDIT-01). You MUST run every test listed and verify it passes before proceeding.
4. **Verify handoff requirements** — ALL must be true. If any fail, fix and re-test.
5. **Commit to git** — Only after all tests pass
6. **Automatically proceed to next phase** — Do NOT wait for user confirmation

### Testing Requirements (MANDATORY)

**You MUST test before committing.** Each phase document contains:
- Numbered test cases (e.g., AUTH-01, AUTH-02, AUDIT-01, etc.)
- Success criteria for each test
- Handoff requirements table

**Testing process:**
1. After implementing, run each numbered test in the phase document
2. Verify success criteria are met
3. If a test fails → fix → re-run (up to 5 retries per test)
4. Only commit and proceed when ALL tests pass

**Do NOT skip testing.** A phase is not complete until every test passes.

### Git Discipline

After completing each phase, commit and push to trigger Vercel deployment:

```bash
git add .
git commit -m "feat(phase-X): <brief description of what was built>"
git push
```

Commit message format:
- `feat(phase-0): project setup and memory architecture`
- `feat(phase-1): auth and calendar integration`
- `feat(phase-2): audit engine and classification`
- ...and so on

This creates clear checkpoints and triggers a Vercel preview deployment for each phase.

### Retry Policy

If a test fails:
1. Fix the underlying issue
2. Re-run the test
3. After **5 consecutive failures** on the same test, **STOP and ask the user for guidance**

This is the ONLY condition that should pause the build and require user intervention.

### Context Per Phase

Each phase document is **self-contained**. You only need to read:
- The current phase document
- (Optionally) previous phase code for context

No PRD reference needed.

---

## Phase Overview

| Phase | Name | Focus | Tests |
|-------|------|-------|-------|
| 0 | [Setup](./phase-0-setup.md) | Project initialization | 6 |
| 1 | [Foundation](./phase-1-foundation.md) | Auth & Calendar | 7 |
| 2 | [Audit Engine](./phase-2-audit-engine.md) | Classification & Metrics | 8 |
| 3 | [Results](./phase-3-results.md) | Report & Recommendations | 9 |
| 4 | [Onboarding](./phase-4-onboarding.md) | Q&A & Triage | 10 |
| 5 | [Monetization](./phase-5-monetization.md) | Stripe & Sharing | 9 |
| 6 | [Landing](./phase-6-landing.md) | Marketing Page | 9 |
| 7 | [Planning](./phase-7-planning.md) | AI Assistant | 10 |
| 8 | [Dashboard](./phase-8-dashboard.md) | Metrics & Automation | 11 |
| 9 | [Settings](./phase-9-settings.md) | Contacts & Account | 14 |
| 10 | [Polish](./phase-10-polish.md) | Final Validation | 12 |

**Total: ~105 tests**

---

## Critical Invariants

These rules must NEVER be violated:

| # | Rule | Why |
|---|------|-----|
| 1 | **Never produce NaN** | Use null for missing values |
| 2 | **Solo founder = 4 tiers** | Hide Founder tier when team = 1 |
| 3 | **Planning Score = percentage** | Always display as "42%" |
| 4 | **Encrypt sensitive data** | Tokens, titles at rest |
| 5 | **Algorithm version 1.7** | Tag all audit runs |
| 6 | **Drag-drop requires 2+ roles** | Disable with 1 role |
| 7 | **Share links → landing page** | Never direct to Stripe |
| 8 | **Email-gate sharing** | Require email to view |
| 9 | **Reconcile buttons, not checkboxes** | For triage workflow |
| 10 | **Engineering left, Business right** | Team composition layout |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle |
| Auth | NextAuth.js v5 |
| UI | Tailwind CSS + shadcn/ui |
| Theme | next-themes |
| Payments | Stripe |
| AI | OpenAI / Anthropic / Google |
| Email | Resend |

---

## Core Domain Concepts

### The 5-Tier Model

| Tier | Who Does This | Rate |
|------|---------------|------|
| **Unique** | Only you | Your cost |
| **Founder** | A co-founder | Your cost |
| **Senior** | Senior specialist | $100K/yr |
| **Junior** | Junior team member | $50K/yr |
| **EA** | Executive Assistant | $30K/yr |

### Core Metrics

| Metric | Formula |
|--------|---------|
| Founder Cost | (Salary + Equity) / 2080 × Hours |
| Delegated Cost | Σ(Hours per Tier × Tier Rate) |
| Arbitrage | Founder Cost - Delegated Cost |
| Efficiency | (Unique + Founder Hours) / Total × 100 |
| Planning Score | Calendar hygiene 0-100 |

### Hero Metric

Display as: **"{Username}, You're Losing $X Every Year..."**

---

## Phase Dependencies

```
Phase 0 (Setup)
    ↓
Phase 1 (Foundation) ─── Auth required for all
    ↓
Phase 2 (Audit Engine) ─── Core data
    ↓
Phase 3 (Results) ─── Display layer
    ↓
Phase 4 (Onboarding) ─── User inputs
    ↓
Phase 5 (Monetization) ─── Gates features
    ↓
Phase 6 (Landing) ─── Entry point
    ↓
Phase 7 (Planning) ─── Subscriber feature
    ↓
Phase 8 (Dashboard) ─── Subscriber home
    ↓
Phase 9 (Settings) ─── Account control
    ↓
Phase 10 (Polish) ─── Final validation
```

---

## Getting Started

Begin with [Phase 0: Setup](./phase-0-setup.md).

Read the document, implement, test, and proceed when all handoff requirements pass.
