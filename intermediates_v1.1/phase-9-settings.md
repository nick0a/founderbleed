# Phase 9: Settings & Contacts

## Overview

Build the contacts comparison feature and comprehensive settings page. This phase adds social/competitive elements and gives users full control over their account.

---

## Prerequisites

- Phase 8 complete (dashboard and automation working)
- Subscription management functional
- All user data models in place

---

## Contacts System

### Database Schema

```typescript
// Contacts
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  contactUserId: uuid('contact_user_id').references(() => users.id),
  contactEmail: text('contact_email'), // if not yet registered
  status: text('status').default('pending'), // 'pending', 'accepted', 'declined'
  invitedAt: timestamp('invited_at').defaultNow(),
  acceptedAt: timestamp('accepted_at')
});
```

### Invite Flow

1. User enters email to invite
2. System sends invitation email
3. Recipient clicks link
4. If has account → Accept/decline
5. If no account → Prompt to sign up
6. Accept creates bidirectional connection

### Leaderboard

| Ranking | Metrics |
|---------|---------|
| Efficiency | By Efficiency Score |
| Planning | By Planning Score |
| Improvement | By % improvement over time |

Only shows accepted contacts.

### Privacy Controls

| Setting | Effect |
|---------|--------|
| Share scores | If off, appear but score hidden |
| Anonymous mode | Show as "Anonymous Founder" |

---

## Settings Page Structure

### 1. Account Section
- Email (display only)
- Name (editable)
- **Username** (editable, for personalized reports)
- Delete account

### 2. Team Composition
- Same UI as onboarding
- **Engineering LEFT, Business RIGHT**
- **QA Engineer included**
- Founder count
- Saves for future audits

### 3. Compensation & Rates
- Salary with **Annual/Hourly toggle**
- Currency selector
- Equity details (valuation, percentage, vesting)
- Tier rates:
  - Senior Engineering
  - Senior Business
  - Junior Engineering
  - Junior Business
  - EA

### 4. Subscription
- Current plan display
- Next billing date
- LLM budget usage (spent / total)
- "Manage Subscription" → Stripe portal
- "Upgrade" if on lower tier

### 5. BYOK Management
- Add/remove API keys
- Provider selector (OpenAI, Anthropic, Google)
- Key masked after save
- Validate on save
- Priority setting (BYOK First, Budget First, BYOK Premium Only)

### 6. Calendar Connection
- Connected account email
- Current scopes (read-only or read/write)
- "Upgrade to write access" button
- "Disconnect" button (with confirmation)

### 7. Audit Schedule (Subscribers)
- Enable/disable toggles for weekly/monthly/annual
- Week start day selector
- Timezone selector
- Next scheduled runs display

### 8. Notifications
- Email: Audit ready (toggle)
- Email: Weekly digest (toggle)
- In-app: Audit ready (toggle)

### 9. Data & Privacy
- **Export Data (JSON)** - downloads all user data
- **Export Data (Markdown)** - human-readable format
- **Delete All Data** - with confirmation
- Manage shared reports (list with revoke buttons)

### 10. Contacts
- Invite by email
- Pending invitations (sent and received)
- Connected contacts list
- Privacy toggles

---

## Data Export

### JSON Format

```json
{
  "exportedAt": "2025-01-05T12:00:00Z",
  "user": { "email": "...", "name": "...", ... },
  "auditRuns": [
    {
      "id": "...",
      "dateStart": "...",
      "dateEnd": "...",
      "metrics": { ... },
      "events": [ { "title": "...", "tier": "...", ... } ]
    }
  ],
  "roleRecommendations": [ ... ],
  "settings": { ... }
}
```

### Markdown Format

```markdown
# Founder Bleed Data Export
Exported: January 5, 2025

## Summary
- Total Audits: 12
- Latest Efficiency Score: 72%
- Latest Planning Score: 65%

## Latest Audit (Dec 1-31, 2024)
### Metrics
- Total Hours: 168
- Unique: 42h (25%)
- Founder: 28h (17%)
...

### Role Recommendations
1. Senior Developer (20 hrs/week)
...
```

---

## Account Deletion

### Confirmation Flow

1. Click "Delete Account"
2. Modal explains consequences:
   - All audits deleted
   - Subscription cancelled
   - Cannot be undone
3. Type "DELETE" to confirm
4. Re-authenticate (password or OAuth)
5. Deletion processes

### Deletion Process

1. Cancel active subscription (if any)
2. Delete all audit runs and events
3. Delete calendar connections (tokens)
4. Delete notifications
5. Delete contacts
6. Delete shared reports
7. Delete user record
8. Send confirmation email
9. Sign out and redirect to landing

---

## Test Instructions

**Retry Policy:** If a test fails, fix and retry. After 5 failed attempts, ask the user.

### SETTINGS-01: Settings Page Loads

**What to verify:**
- Navigate to /settings

**Success criteria:**
- Page loads
- All sections visible
- Current values populated

### SETTINGS-02: Account Info Editable

**What to verify:**
- Change username and save

**Success criteria:**
- Username updates
- Persists after refresh
- Reflected in results page

### SETTINGS-03: Team Composition Saves

**What to verify:**
- Modify team composition
- Save, run new audit

**Success criteria:**
- Changes persist
- New audit uses updated composition
- Engineering left, Business right

### SETTINGS-04: Compensation Saves

**What to verify:**
- Update compensation
- Save, view results

**Success criteria:**
- Compensation updates
- Results recalculate
- Arbitrage reflects new values

### SETTINGS-05: BYOK Validates

**What to verify:**
- Enter invalid API key
- Enter valid API key

**Success criteria:**
- Invalid: error, not saved
- Valid: saved, masked
- Can toggle priority

### SETTINGS-06: Calendar Disconnect

**What to verify:**
- Click disconnect, confirm

**Success criteria:**
- Confirmation modal
- Connection removed
- Can reconnect via OAuth

### SETTINGS-07: Notification Toggles

**What to verify:**
- Toggle email notifications off
- Toggle specific type off

**Success criteria:**
- Settings save
- Notifications respect settings

### SETTINGS-08: JSON Export

**What to verify:**
- Click "Export (JSON)"

**Success criteria:**
- File downloads
- Valid JSON
- Contains audit data, events, metrics

### SETTINGS-09: Markdown Export

**What to verify:**
- Click "Export (Markdown)"

**Success criteria:**
- File downloads
- Readable format
- Contains summary, recommendations

### SETTINGS-10: Account Deletion

**What to verify:**
- Initiate deletion
- Complete confirmation

**Success criteria:**
- Modal explains consequences
- Requires typing "DELETE"
- User signed out
- Data removed
- Redirected to landing

### SETTINGS-11: Contact Invite

**What to verify:**
- Invite contact by email

**Success criteria:**
- Invitation sent
- Appears in pending
- Recipient receives email

### SETTINGS-12: Contact Accept

**What to verify:**
- Accept invitation (from another account)

**Success criteria:**
- Connection established
- Both see each other
- Appears in leaderboard

### SETTINGS-13: Leaderboard Shows

**What to verify:**
- With contacts, view leaderboard

**Success criteria:**
- Contacts listed
- Ranked by score
- Privacy respected

### SETTINGS-14: Privacy Toggle

**What to verify:**
- Toggle "Share scores" off

**Success criteria:**
- Name appears, score hidden
- Contacts can't see metrics
- Toggle persists

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Settings page loads | Navigate to /settings |
| Account editable | Update username, persists |
| Team comp saves | Changes apply |
| Compensation saves | Results recalculate |
| BYOK validates | Invalid rejected, valid encrypted |
| Calendar disconnect | Can disconnect/reconnect |
| Notifications configurable | Toggles work |
| JSON export | Downloads valid JSON |
| Markdown export | Downloads readable MD |
| Account deletion | Full flow, data removed |
| Contact invite | Email sent |
| Contact accept | Bidirectional connection |
| Leaderboard works | Ranked display |
| Privacy toggle | Hides score |

**Do not proceed to Phase 10 until all tests pass.**

---

## Next Phase

Once all tests pass, proceed to **Phase 10: Polish & Validation**.
