# Phase 6: Landing Page

## Overview

Build the marketing landing page that introduces the product, explains the value proposition, and drives users to sign up. This is the public face of the product.

---

## Prerequisites

- Phase 5 complete (subscription and payments working)
- OAuth flow functional
- Core product loop complete

---

## Branding

### Logo: Blood Drop
- SVG blood drop shape
- **Gradient fill:** #DC2626 (red-600) to #991B1B (red-800)
- Clean, minimal design
- Works on both light and dark backgrounds
- Use unique gradient IDs to prevent SVG conflicts

### Brand Colors
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary | Red gradient | Red gradient |
| Background | White | Gray-900 |
| Text | Gray-900 | White |
| Accent | Blue-600 | Blue-400 |

---

## Page Structure

### Header
- Blood drop logo + "Founder Bleed" text (left)
- Dark/light mode toggle (right)
- Sign in link (right, if not logged in)
- Dashboard link (right, if logged in)

### Hero Section (Above the Fold)
- **Headline:** "Stop Bleeding Time on Work That Isn't Yours"
- **Subheadline:** "Discover how much you're losing by doing work that should be delegated. Get a personalized hiring prescription in minutes."
- **Primary CTA:** "TRIAGE YOUR TIME" (centered, prominent)
- **Badge below CTA:** "AI-Powered Calendar Audit"
- **Privacy note:** "Read-only calendar access."

### "How It Works" Carousel
Interactive 3-step carousel:

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | Calendar | TRIAGE | We analyze your calendar and classify every hour by who should be doing it |
| 2 | Users | DELEGATE | Get specific hiring recommendations with ready-to-use job descriptions |
| 3 | Sparkles | PLAN | Our AI helps you restructure your calendar for maximum leverage |

- Navigation arrows (left/right)
- Navigation dots
- Auto-advance optional (pause on hover)

### Delegation Chart
Dual-axis chart combining salary (bars) and available flex time (exponential line).

**Implementation note:** The following two charts should be combined into a single dual-axis chart. They are shown separately here due to ASCII limitations.

#### Chart 1: Annual Salary (Bar Chart)
```
Salary ($)
         │
    250k │ ████████
         │ ████████
         │ ████████
    150k │ ████████  ██████
         │ ████████  ██████
     75k │ ████████  ██████  ████
         │ ████████  ██████  ████
     25k │ ████████  ██████  ████  ██
         │ ████████  ██████  ████  ██
       0 └─────────────────────────────────
           Founder   Senior  Junior   EA
```

#### Chart 2: Available Flex Time (Exponential Line)
```
Flex (%)
         │
     30% │                            ●
         │                          ╱
         │                        ╱
     18% │                    ●
         │                  ╱
         │               ╱
     10% │           ●
         │         ╱
         │      ╱
      2% │  ●
         │
       0 └─────────────────────────────────
           Founder   Senior  Junior   EA
```

#### Data Table
| Role | Annual Salary | Available Flex |
|------|---------------|----------------|
| Founder | $250,000 | 2% |
| Senior | $150,000 | 10% |
| Junior | $75,000 | 18% |
| EA | $25,000 | 30% |

**Key insight:** Founders cost the most but have almost no scheduling flexibility (~2% of their calendar). Lower-cost roles like EAs often have significant unused capacity (~30%) because delegation isn't happening systematically.

#### Combined Chart Specifications
- **Left Y-axis:** Annual salary ($0 to $250,000)
- **Right Y-axis:** Available flex time (0% to 35%)
- **X-axis:** Roles from Founder to EA
- **Bars:** Color-coded by role (use tier colors from brand palette)
- **Line:** Exponential curve connecting the flex data points
- **Interactivity:** Hover states show exact values for each role with tooltips explaining the delegation opportunity

### Sample Report Preview
- Screenshot or interactive demo
- Blur/anonymize sensitive numbers
- Call-out boxes highlighting:
  - Hero metric
  - Role recommendations
  - Planning Score

### Privacy Section
- "Read-only access" emphasized
- "Your data is encrypted"
- "Delete anytime"
- Link to privacy policy

### Final CTA
- Repeat "TRIAGE YOUR TIME" button
- Centered, same styling as hero

### Footer
- Privacy Policy link
- Terms of Service link
- Contact/Support link
- © 2026 Founder Bleed

---

## Dark Mode

- Full support via next-themes
- Toggle in header
- All sections adapt correctly
- Logo works on both backgrounds
- Persist preference to localStorage
- No flash of wrong theme on load

---

## Mobile Responsiveness

Breakpoint: 375px minimum

- Content reflows appropriately
- No horizontal scrolling
- CTA remains tappable (44x44px minimum touch target)
- Carousel works on touch
- Chart scales down appropriately
- Tables horizontally scrollable if needed

---

## Build Instructions

### 6.1 Logo Component

Create `src/components/logo.tsx`:

```typescript
export function Logo({ className }: { className?: string }) {
  // Use unique gradient ID to prevent conflicts
  const gradientId = `blood-drop-gradient-${Math.random().toString(36).slice(2)}`;

  return (
    <svg className={className} viewBox="0 0 24 32" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="12" y1="0" x2="12" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 0 0 14 0 21C0 27.627 5.373 32 12 32C18.627 32 24 27.627 24 21C24 14 12 0 12 0Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
```

### 6.2 Landing Page

Create `src/app/page.tsx`:

Key sections:
- Hero with CTA
- How It Works carousel
- Delegation chart
- Sample report preview
- Privacy section
- Final CTA
- Footer

### 6.3 Carousel Component

Create `src/components/how-it-works-carousel.tsx`:

```typescript
// Three steps: Triage, Delegate, Plan
// Navigation arrows and dots
// Auto-advance with pause on hover
```

### 6.4 Delegation Chart Component

Create `src/components/delegation-chart.tsx`:

```typescript
// Dual-axis chart with bars (salary) and line (flex time)
// Left Y-axis: Annual salary ($0 to $250k)
// Right Y-axis: Available flex time (0% to 35%)
// X-axis: Founder, Senior, Junior, EA
// Bars: Color-coded by role, decreasing height left to right
// Line: Exponential curve increasing left to right
// Hover states with tooltips showing exact values
// Responsive scaling
```

---

## Test Instructions

**Retry Policy:** If a test fails, fix and retry. After 5 failed attempts, ask the user.

### LANDING-01: Page Renders

**What to verify:**
- Navigate to `/`
- Check console for errors

**Success criteria:**
- No JavaScript errors
- All sections visible
- No layout issues

### LANDING-02: Logo Has Gradient

**What to verify:**
- Inspect logo element

**Success criteria:**
- Blood drop shape renders
- Gradient visible (#DC2626 to #991B1B)
- Logo is crisp (SVG, not pixelated)

### LANDING-03: CTA Text Correct

**What to verify:**
- Check primary CTA button

**Success criteria:**
- Text is "TRIAGE YOUR TIME" (all caps)
- Button is prominent and centered
- Initiates OAuth on click

### LANDING-04: Carousel Navigates

**What to verify:**
- Click through carousel

**Success criteria:**
- Shows "Triage" step
- Next arrow shows "Delegate"
- Next arrow shows "Plan"
- Dots work
- Can navigate back and forth

### LANDING-05: Delegation Chart Displays Correctly

**What to verify:**
- Find delegation chart

**Success criteria:**
- All 4 roles visible: Founder, Senior, Junior, EA
- Bars show decreasing salary left to right
- Line shows exponential increase in flex time left to right
- Both axes labeled correctly
- Hover states show values

### LANDING-06: Dark Mode Works

**What to verify:**
- Click dark mode toggle
- Check all sections

**Success criteria:**
- Background changes to dark
- Text becomes light
- Logo remains visible
- All sections readable
- Preference persists after refresh

### LANDING-07: Privacy Note Present

**What to verify:**
- Look for privacy messaging

**Success criteria:**
- "Read-only" mentioned
- Privacy section exists
- Link to privacy policy

### LANDING-08: Mobile Responsive

**What to verify:**
- Resize to 375px width

**Success criteria:**
- No horizontal scrolling
- Content accessible
- CTA tappable (44x44px)
- Carousel works on touch
- Chart scales

### LANDING-09: CTA Initiates OAuth

**What to verify:**
- Click "TRIAGE YOUR TIME"

**Success criteria:**
- Redirects to Google OAuth
- Correct scopes requested (calendar.readonly)
- After consent, returns to app

### LANDING-10: Sample Report Data Review

**What to verify:**
- Review the sample report preview section
- Check all displayed metrics and data

**Success criteria:**
- Hero metric shows realistic value (e.g., "$127,000/year in recoverable time")
- Time breakdown percentages are believable (should total ~100%)
- Role recommendations match typical founder patterns:
  - Founder-only work: 15-25%
  - Delegatable to Senior: 20-30%
  - Delegatable to Junior: 25-35%
  - Delegatable to EA: 15-25%
- Planning Score displayed (0-100 scale)
- Meeting categories reflect real calendar items (1:1s, team meetings, external calls, focus time, admin)
- Numbers don't look placeholder-ish (avoid round numbers like 10%, 20%, 30%)
- Data tells a compelling story about delegation opportunity

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Page loads | No console errors |
| Logo has gradient | Blood drop with red gradient |
| CTA correct | "TRIAGE YOUR TIME" centered |
| Carousel works | All 3 steps navigable |
| Delegation chart works | Bars + line with 4 roles |
| Dark mode works | Toggle switches, persists |
| Privacy note present | Read-only messaging |
| Mobile responsive | No scroll at 375px |
| CTA initiates OAuth | Starts sign-in flow |
| Sample report realistic | Data looks like real audit results |

**Do not proceed to Phase 7 until all tests pass.**

---

## User Review & Verification

**⏸️ STOP: User review required before proceeding to the next phase.**

The agent has completed this phase. Before continuing, please verify the build yourself.

### Manual Testing Checklist

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Landing page loads | Navigate to `/` | Page renders with hero, carousel, chart, and CTAs |
| 2 | Blood drop logo | Look at the header logo | Red gradient blood drop shape (#DC2626 to #991B1B) |
| 3 | CTA text correct | Check the main button | Says "TRIAGE YOUR TIME" (all caps, centered) |
| 4 | Carousel works | Click arrows or dots in "How It Works" | Shows Triage → Delegate → Plan steps |
| 5 | Delegation chart works | Look at the delegation chart | Bars (salary) + exponential line (flex) with 4 roles |
| 6 | Dark mode toggle | Click theme toggle | All sections switch to dark mode correctly |
| 7 | CTA starts OAuth | Click "TRIAGE YOUR TIME" | Redirects to Google sign-in |
| 8 | Mobile responsive | Resize browser to 375px wide | No horizontal scrolling, content accessible |
| 9 | Sample report realistic | Review sample report preview | Data shows realistic metrics (non-round percentages, believable hero metric, proper role breakdown) |

### What to Look For

- Professional, polished appearance
- Privacy messaging visible ("Read-only access")
- Logo gradient visible on both light and dark backgrounds
- Touch-friendly on mobile (44x44px minimum tap targets)
- Sample report data looks authentic (not placeholder values)

### Known Limitations at This Stage

- Planning Assistant paywall shown but not fully tested until Phase 7
- Dashboard comparison not yet implemented

### Proceed to Next Phase

Once you've verified the above, instruct the agent:

> "All Phase 6 tests pass. Proceed to Phase 7: Planning Assistant."

If issues were found:

> "Phase 6 issue: [describe problem]. Please fix before proceeding."

---

## Next Phase

Once all tests pass, proceed to **Phase 7: Planning Assistant**.
