# Phase 10: Polish & Validation

## Overview

Final testing, polish, and validation phase. Ensure the complete application works end-to-end, meets all quality standards, and is ready for deployment.

---

## Prerequisites

- All previous phases (0-9) complete
- All features functional
- No known blocking bugs

---

## Critical Invariants Checklist

These must ALL be verified across the entire app:

| # | Invariant | Test Method |
|---|-----------|-------------|
| 1 | **No NaN anywhere** | Search all pages for "NaN" |
| 2 | **Solo founder = 4 tiers** | Set team to 1 founder, check dropdowns |
| 3 | **Planning Score shows %** | Check results, dashboard - always "X%" |
| 4 | **Drag-drop requires 2+ roles** | 1 role = no handles, 2+ = handles |
| 5 | **Share links → landing page** | Shared report CTA goes to `/` |
| 6 | **Email-gate on sharing** | Must enter email to view shared |
| 7 | **Reconcile buttons, not checkboxes** | Triage uses green checkmarks |
| 8 | **Engineering left, Business right** | Team composition layout |
| 9 | **QA Engineer included** | In engineering column |
| 10 | **Algorithm version 1.7** | All audit runs tagged |
| 11 | **Header/nav uniform across all screens** | Verify header appears on all pages with: logo linking to `/`, nav links to relevant pages (Dashboard, Settings), "Run Audit" CTA, "Subscribe" CTA for free tier users. Free tier users see gated features as disabled/locked. Subscribers see full nav without upgrade prompts. |

---

## End-to-End User Journeys

### Journey 1: New Free User
```
1. Land on homepage
2. Click "TRIAGE YOUR TIME"
3. Complete OAuth
4. Processing page with Q&A
5. Triage classifications
6. View results
7. See Subscribe CTA
```

### Journey 2: Subscriber
```
1. Sign in
2. Land on Dashboard
3. View Top 3 Actions
4. Run new audit
5. Open Planning Assistant
6. Add events to calendar
7. Compare periods
8. Configure settings
```

### Journey 3: Share Flow
```
1. Generate share link
2. Open in incognito
3. Email capture modal
4. Enter email
5. Verify email
6. View shared report
7. CTA → landing page (NOT Stripe)
```

---

## Visual QA Checklist

Check every page in BOTH light and dark mode:

| Page | Light | Dark |
|------|-------|------|
| Landing page | ☐ | ☐ |
| OAuth/loading | ☐ | ☐ |
| Processing page | ☐ | ☐ |
| Triage page | ☐ | ☐ |
| Results page | ☐ | ☐ |
| Dashboard | ☐ | ☐ |
| Planning Assistant | ☐ | ☐ |
| Settings | ☐ | ☐ |
| Shared report | ☐ | ☐ |

For each, verify:
- Colors contrast properly
- Text readable
- Components aligned
- No visual glitches
- Transitions smooth

---

## Mobile Responsiveness

Test at 375px viewport width:

| Check | Pass |
|-------|------|
| No horizontal scrolling | ☐ |
| Touch targets 44x44px minimum | ☐ |
| Text readable without zooming | ☐ |
| Navigation accessible | ☐ |
| Forms usable | ☐ |
| Charts scale appropriately | ☐ |
| Tables scrollable (if needed) | ☐ |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Landing page load | < 2 seconds |
| Results page load | < 3 seconds |
| Dashboard load | < 2 seconds |
| Most API endpoints | < 1 second |
| AI response start | < 3 seconds |
| 1000+ events page load | < 5 seconds |
| Metrics recalculation | < 500ms |

---

## Security Checklist

| Check | Pass |
|-------|------|
| Protected routes require auth | ☐ |
| Invalid tokens rejected | ☐ |
| Session expiry handled | ☐ |
| Users only access own data | ☐ |
| Shared reports hide salary | ☐ |
| Subscription gating enforced | ☐ |
| Tokens encrypted at rest | ☐ |
| Event titles encrypted | ☐ |
| BYOK keys encrypted | ☐ |

---

## Build Verification

```bash
# Run linter
npm run lint
# Should pass with no errors

# Run type check
npx tsc --noEmit
# Should pass with no errors

# Production build
npm run build
# Should complete without errors

# Check for console.logs
grep -r "console.log" src/
# Remove any found in production code
```

---

## Complete E2E Checklist

Execute every item sequentially:

```
[ ] 1. Navigate to homepage (/) - renders without errors
[ ] 2. Blood drop logo displays correctly with gradient
[ ] 3. "How It Works" carousel navigates between all 3 steps
[ ] 4. Delegation pyramid displays all 5 tiers
[ ] 5. CTA says "TRIAGE YOUR TIME" (centralized)
[ ] 6. Complete OAuth flow
[ ] 7. Permissions page shows "Read-only access" messaging
[ ] 8. Processing page shows inline Q&A
[ ] 9. Team composition: Engineering left, Business right, QA included
[ ] 10. Annual/hourly toggle works with quick presets
[ ] 11. Select 1-year date range - shows "365 days"
[ ] 12. Continue button disabled until Q&A + processing complete
[ ] 13. Triage page shows reconcile buttons (NOT checkboxes)
[ ] 14. Triage shows correct tiers (4 for solo, 5 for team, Engineering, Business, Universal verticals)
[ ] 15. First-time users see tier explanation modal
[ ] 16. Results page shows editable username field
[ ] 17. Results page shows Planning Score as percentage ("X%")
[ ] 18. Hero metric includes username: "{Username}, You're Losing..."
[ ] 19. "Delegate to Your Team" section (if team exists)
[ ] 20. "AI-Powered Automation" section displays
[ ] 21. Job descriptions show "Tasks You'll Take Over" with hours/week
[ ] 22. Subscribe CTA at end of results (free users)
[ ] 23. Share button - requires email, links to landing page
[ ] 24. Subscribe → Stripe checkout → Dashboard
[ ] 25. "Plan Your Week" opens Planning Assistant (subscribers)
[ ] 26. Planning calendar view shows per-event planning scores
[ ] 27. AI responds to messages
[ ] 28. Dashboard shows Top 3 Actions
[ ] 29. Dashboard shows This Week Preview
[ ] 30. Contacts can be invited and accepted
[ ] 31. Comparison view works for week/month/quarter/year
[ ] 32. NO NaN values anywhere
[ ] 33. Dark mode works on all pages
[ ] 34. Settings page shows tier rate editors
[ ] 35. Settings page shows annual/hourly toggle
[ ] 36. Settings page shows audit schedule (subscribers)
[ ] 37. Settings page shows BYOK management (subscribers)
```

---

## Test Instructions

**Retry Policy:** If a test fails, fix and retry. After 5 failed attempts, ask the user.

### FINAL-01: Complete New User Journey

**What to verify:**
- Start from landing page
- Complete full flow through to results/dashboard

**Success criteria:**
- No errors at any step
- All pages render correctly
- Data flows through entire system

### FINAL-02: No NaN Anywhere

**What to verify:**
- Navigate through all pages
- Search for "NaN"

**Success criteria:**
- Zero instances of "NaN" visible
- Zero "undefined" visible (except where intended)

### FINAL-03: Solo Founder Tier Hiding

**What to verify:**
- Set team to solo founder
- Check all tier displays

**Success criteria:**
- Triage: 4 options
- Results: 4 tiers
- No "Founder" anywhere

### FINAL-04: Dark Mode Complete

**What to verify:**
- Toggle dark mode
- Visit every page

**Success criteria:**
- All pages render correctly
- No white flashes
- All text readable

### FINAL-05: Mobile Responsive

**What to verify:**
- Set viewport to 375px
- Navigate all pages

**Success criteria:**
- No horizontal scrolling
- All content accessible
- Touch targets adequate

### FINAL-06: Share Flow Complete

**What to verify:**
- Generate share link
- Complete viewing flow

**Success criteria:**
- Email required
- Report displays (no salary)
- CTA → landing page

### FINAL-07: Planning Score Percentage

**What to verify:**
- Check Planning Score everywhere

**Success criteria:**
- Shows "X%" format everywhere
- Never bare number without %

### FINAL-08: Algorithm Version

**What to verify:**
- Check audit runs

**Success criteria:**
- All have `algorithmVersion: "1.7"`

### FINAL-09: Build Succeeds

**What to verify:**
- Run `npm run build`

**Success criteria:**
- Completes without errors
- No TypeScript errors

### FINAL-10: Lint Passes

**What to verify:**
- Run `npm run lint`

**Success criteria:**
- No errors

### FINAL-11: API Performance

**What to verify:**
- Time key API endpoints

**Success criteria:**
- Most < 1 second
- Complex < 2 seconds
- AI streaming < 3 seconds

### FINAL-12: Large Audit Performance

**What to verify:**
- Audit with 1000+ events
- Load results page

**Success criteria:**
- Page loads < 5 seconds
- No browser freeze

### FINAL-13: Header/Navigation Consistency

**What to verify:**
- Visit every page in the app (landing, processing, triage, results, dashboard, settings, planning assistant, shared report)
- Check header appears and is consistent
- Test as both free user and subscriber

**Success criteria:**
- Header appears on all authenticated pages
- Logo links to `/` (landing page)
- Nav links present: Dashboard, Settings
- "Run Audit" CTA visible and functional
- Free tier users see "Subscribe" CTA in header
- Subscribers do not see upgrade prompts in header
- Free tier users see locked/disabled states on gated features (e.g., Planning Assistant)
- Header styling consistent across light/dark mode
- Header responsive on mobile (hamburger menu or collapsed nav)

---

## Deployment Checklist

Before deploying to production:

```
[ ] All production env vars set
[ ] Stripe in live mode (not test)
[ ] Production database connected
[ ] Encryption keys are production keys
[ ] Domain configured with SSL
[ ] Google OAuth production credentials
[ ] Stripe webhooks → production URL
[ ] Email service configured
[ ] Error tracking set up (Sentry)
[ ] Database backup configured
```

---

## Post-Deployment Verification

After deploying:

1. Complete one full user journey on production
2. Verify Stripe payments work
3. Verify Google OAuth works
4. Check error tracking receives events
5. Verify scheduled jobs run

---

## Handoff Requirements

Phase 10 (and entire build) is complete when ALL are true:

| Requirement | How to Verify |
|-------------|---------------|
| Full journey works | Manual walkthrough |
| No NaN values | Search all pages |
| Solo founder = 4 tiers | Test solo founder |
| Dark mode complete | All pages correct |
| Mobile responsive | 375px test |
| Share flow works | Complete flow |
| Planning Score % | Check all displays |
| Algorithm 1.7 | Check audits |
| Build succeeds | npm run build |
| Lint passes | npm run lint |
| API performance met | Time endpoints |
| Large data handled | 1000+ events |
| Header/nav consistent | Uniform on all pages, CTAs correct per tier |

---

## User Review & Verification

**⏸️ STOP: Final user review required before deployment.**

The agent has completed all phases. Before deploying, please verify the complete build yourself.

### Final Manual Testing Checklist

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Complete new user journey | Start from `/`, complete OAuth, audit, view results | Full flow works without errors |
| 2 | No NaN anywhere | Navigate through all pages, search for "NaN" | Zero instances of NaN visible |
| 3 | Solo founder = 4 tiers | Set team to 1 founder, check all tier dropdowns | Only Unique, Senior, Junior, EA (no Founder) |
| 4 | Dark mode complete | Toggle dark mode, visit every page | All pages render correctly, no white flashes |
| 5 | Mobile responsive | Set viewport to 375px, test all pages | No horizontal scrolling, touch targets adequate |
| 6 | Share flow complete | Generate share link, open incognito, complete flow | Email required → report visible → CTA goes to `/` |
| 7 | Planning Score % | Check everywhere Planning Score appears | Always shows "X%" format (never bare number) |
| 8 | Build succeeds | Run `npm run build` | Completes without errors |
| 9 | Lint passes | Run `npm run lint` | No errors |
| 10 | Header/nav consistent | Visit all pages as free user and subscriber | Uniform header with logo → `/`, nav links, "Run Audit" CTA, "Subscribe" for free tier, gated features locked |

### Critical Invariants to Verify

- [ ] No NaN anywhere in the application
- [ ] Solo founder sees only 4 tiers
- [ ] Planning Score always shows % symbol
- [ ] Drag-drop only appears with 2+ roles
- [ ] Share links go to landing page, not Stripe
- [ ] Engineering left, Business right in team composition
- [ ] QA Engineer in engineering column
- [ ] Header/nav uniform across all screens with correct CTAs per user tier

### Ready for Deployment

Once all tests pass, the MVP is ready! Instruct the agent:

> "All Phase 10 tests pass. MVP is complete and ready for deployment."

If issues remain:

> "Phase 10 issue: [describe problem]. Please fix before deployment."

---

## Congratulations!

If all tests pass, the Founder Bleed MVP is complete and ready for users.

**Next steps:**
- Private beta launch
- Gather user feedback
- Iterate based on learnings
- See Phase 1+ Backlog for future features
