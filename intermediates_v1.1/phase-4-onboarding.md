# Phase 4: Onboarding Flow

## Overview

Build the processing page with inline Q&A workflow and the classification review (triage) page. This phase creates the guided experience that collects user inputs during audit processing and allows users to review/approve classifications.

---

## Prerequisites

- Phase 3 complete (results page working)
- Audit engine classifies events
- Metrics calculate correctly

---

## Navigation Flow

```
OAuth Complete → Processing Page (with inline Q&A) → Triage Page → Results Page
```

---

## Q&A Workflow Questions

| # | Question | Input Type | Required | Default |
|---|----------|------------|----------|---------|
| 1 | Who's on your team? | Click-to-add roles | Yes | 1 Founder (you) |
| 2 | What's your compensation? | Numeric with toggle | Yes | None |
| 3 | What currency? | Dropdown | Yes | USD |
| 4 | Company valuation? | Numeric | No | Skip |
| 5 | Equity percentage? | Numeric (%) | If Q4 answered | None |
| 6 | Vesting period (years)? | Numeric | If Q4+Q5 answered | 4 |
| 7-11 | Tier rates (Senior Eng, Senior Bus, Junior Eng, Junior Bus, EA) | Numeric | No | Defaults |

---

## Team Composition Layout

**CRITICAL:** Engineering roles on LEFT, Business roles on RIGHT

```
┌─────────────────────────────────────────────────────────────┐
│ Founder (including you): [+] 1 [-]                          │
├────────────────────────────┬────────────────────────────────┤
│ ENGINEERING (Left)         │ BUSINESS (Right)               │
├────────────────────────────┼────────────────────────────────┤
│ Senior Engineering: [+] 0  │ Senior Business: [+] 0         │
│ Junior Engineering: [+] 0  │ Junior Business: [+] 0         │
│ QA Engineer: [+] 0         │ Executive Assistant: [+] 0     │
├────────────────────────────┴────────────────────────────────┤
│ Total team size: 1                                          │
│ [○ Just me - I'm a solo founder]                            │
└─────────────────────────────────────────────────────────────┘
```

**Note:** QA Engineer MUST be included in engineering column.

---

## Compensation Input

### Annual/Hourly Toggle

```
┌─────────────────────────────────────────────────────────────┐
│ Your Compensation                                           │
├─────────────────────────────────────────────────────────────┤
│ [Annual Salary ▼] [Hourly Rate]    ← Toggle button          │
│                                                             │
│ $ [300,000___________] /yr                                  │
│                                                             │
│ = $144.23/hr                        ← Live conversion       │
│                                                             │
│ Quick select: [$300K] [$500K] [$800K]                       │
└─────────────────────────────────────────────────────────────┘
```

### Conversion Formula
- Annual to Hourly: `annual / 2080`
- Hourly to Annual: `hourly × 2080`

### Quick Presets
| Mode | Presets |
|------|---------|
| Annual | $300K, $500K, $800K |
| Hourly | $150, $250, $400 |

---

## Classification Review (Triage) Page

### Components

1. **Event Table**
   - Columns: Title, Date, Duration, Suggested Tier, Your Tier (dropdown), Reconcile
   - Sortable by any column
   - Filterable by tier, reconciled status

2. **Tier Dropdown**
   - 5 tiers normally: Unique, Founder, Senior, Junior, EA
   - **4 tiers for solo founder**: Unique, Senior, Junior, EA (NO Founder)
   - Pre-selected with suggested tier

3. **Reconcile Button**
   - Green checkmark icon (NOT checkbox)
   - Clicking confirms the tier selection
   - Row visually updates to show "reconciled" state

4. **Progress Tracking**
   - "X of Y events reviewed"
   - Progress bar
   - "Complete Review" button

5. **Leave Events Section**
   - Separate section or filter
   - Greyed out / non-editable
   - Shows detection confidence
   - Override option if detection wrong

6. **First-Time Tier Explanation Modal**

```
┌─────────────────────────────────────────────────────────────┐
│ How We Categorize Your Time                                 │
├─────────────────────────────────────────────────────────────┤
│ We classify each calendar event by asking:                  │
│ "Who should do this work?"                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ If the answer is...        │ We classify it as...      │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ "Only I can do this"       │ Unique                    │ │
│ │ "A co-founder could do it" │ Founder (hidden for solo) │ │
│ │ "A senior specialist"      │ Senior                    │ │
│ │ "A junior team member"     │ Junior                    │ │
│ │ "An assistant could do it" │ EA                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Got it, let's review] [Don't show again]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Build Instructions

### 4.1 Processing Page

Create `src/app/(dashboard)/processing/page.tsx`:

```typescript
// Key features:
// - Progress indicator showing processing state
// - Inline Q&A form that collects user inputs
// - Team composition with Engineering LEFT, Business RIGHT
// - QA Engineer in engineering column
// - Annual/Hourly toggle with live conversion
// - Quick presets
// - Continue button disabled until both processing AND Q&A complete
```

### 4.2 Triage Page

Create `src/app/(dashboard)/triage/[auditId]/page.tsx`:

```typescript
// Key features:
// - Event table with inline tier dropdowns
// - Green checkmark RECONCILE buttons (not checkboxes)
// - 4 tiers for solo founder, 5 for teams
// - Leave events in separate greyed section
// - First-time modal with "Don't show again"
// - Progress tracking
```

---

## Test Instructions

**Retry Policy:** If a test fails, fix the issue and retry. After 5 failed attempts on the same test, stop and ask the user for guidance.

### ONBOARD-01: Processing Page Shows Q&A

**What to verify:**
- Navigate to processing page
- Q&A sections visible

**Success criteria:**
- Team composition picker visible
- Compensation input visible
- Progress indicator shows

### ONBOARD-02: Team Composition Layout

**What to verify:**
- Check team composition picker layout

**Success criteria:**
- Engineering roles on LEFT
- Business roles on RIGHT
- QA Engineer in engineering column
- Founder count input present
- "Just me" option works

### ONBOARD-03: Annual/Hourly Toggle Works

**What to verify:**
- Enter $300,000 in annual mode
- Toggle to hourly mode
- Toggle back

**Success criteria:**
- $300K converts to ~$144/hr
- Toggling back shows $300K
- Conversion display shows both

### ONBOARD-04: Quick Presets Fill Input

**What to verify:**
- Click "$200K" preset

**Success criteria:**
- Input populates with value
- Conversion updates
- Works in both modes

### ONBOARD-05: Triage Shows Events

**What to verify:**
- Navigate to triage page

**Success criteria:**
- Events listed in table
- Suggested tier shown
- Tier dropdown functional
- Reconcile button visible

### ONBOARD-06: Reconcile Button Works

**What to verify:**
- Click reconcile checkmark

**Success criteria:**
- Row visually changes
- Progress counter updates
- Event marked as reconciled

### ONBOARD-07: Solo Founder Shows 4 Tiers

**What to verify:**
- Set team to 1 founder only
- Check tier dropdowns

**Success criteria:**
- Only: Unique, Senior, Junior, EA
- No "Founder" option

### ONBOARD-08: Leave Events Separate

**What to verify:**
- Audit with leave events
- Check triage page

**Success criteria:**
- Leave events in separate section
- Greyed out
- Override option available

### ONBOARD-09: Tier Explanation Modal

**What to verify:**
- First visit to triage (clear localStorage)

**Success criteria:**
- Modal appears
- All tiers explained
- Dismissible with "don't show again"

### ONBOARD-10: Q&A Answers Persist

**What to verify:**
- Fill in values, refresh page

**Success criteria:**
- Values preserved
- Applied to audit calculations

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Processing page shows Q&A | Team comp and compensation visible |
| Team layout correct | Engineering left, Business right, QA included |
| Annual/hourly toggle works | Conversion accurate |
| Quick presets work | Click fills input |
| Triage shows events | All events with tiers |
| Reconcile button works | Marks events, updates progress |
| Solo founder = 4 tiers | No Founder in dropdown |
| Leave events handled | Separate/greyed |
| Tier explanation shows | Modal on first visit |
| Answers persist | Refresh preserves values |

**Do not proceed to Phase 5 until all tests pass.**

---

## Next Phase

Once all tests pass, proceed to **Phase 5: Monetization**.
