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
