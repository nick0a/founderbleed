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
- **Privacy note:** "Read-only calendar access. We never modify your calendar."

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

### Delegation Pyramid
Visual pyramid showing 5 tiers:

```
         ┌─────┐
         │Unique│ ← Narrowest (highest cost, smallest talent pool)
        ┌┴─────┴┐
        │Founder│
       ┌┴───────┴┐
       │ Senior  │
      ┌┴─────────┴┐
      │  Junior   │
     ┌┴───────────┴┐
     │     EA      │ ← Widest (lowest cost, largest talent pool)
     └─────────────┘
```

- Y-axis: Hourly cost ($25 to $250+)
- X-axis: Available talent pool
- Color-coded by tier
- Hover states with tier descriptions
- Tooltips explaining each tier

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
- Pyramid scales down appropriately
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
- Delegation pyramid
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

### 6.4 Pyramid Component

Create `src/components/delegation-pyramid.tsx`:

```typescript
// 5 horizontal bars
// Color-coded by tier
// Hover states with tooltips
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

### LANDING-05: Pyramid Shows 5 Tiers

**What to verify:**
- Find delegation pyramid

**Success criteria:**
- All 5 tiers visible: Unique, Founder, Senior, Junior, EA
- Pyramid shape (narrow at top)
- Each tier has distinct color
- Labels readable

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
- Pyramid scales

### LANDING-09: CTA Initiates OAuth

**What to verify:**
- Click "TRIAGE YOUR TIME"

**Success criteria:**
- Redirects to Google OAuth
- Correct scopes requested (calendar.readonly)
- After consent, returns to app

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Page loads | No console errors |
| Logo has gradient | Blood drop with red gradient |
| CTA correct | "TRIAGE YOUR TIME" centered |
| Carousel works | All 3 steps navigable |
| Pyramid shows 5 tiers | All visible with colors |
| Dark mode works | Toggle switches, persists |
| Privacy note present | Read-only messaging |
| Mobile responsive | No scroll at 375px |
| CTA initiates OAuth | Starts sign-in flow |

**Do not proceed to Phase 7 until all tests pass.**

---

## Next Phase

Once all tests pass, proceed to **Phase 7: Planning Assistant**.
