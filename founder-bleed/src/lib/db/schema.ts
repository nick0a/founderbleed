import { pgTable, uuid, text, timestamp, numeric, boolean, jsonb, primaryKey, integer } from 'drizzle-orm/pg-core';
import type { AdapterAccount } from 'next-auth/adapters';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  username: text('username'),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp('created_at').defaultNow(),

  // Compensation
  salaryAnnual: numeric('salary_annual'),
  salaryInputMode: text('salary_input_mode').default('annual'),
  companyValuation: numeric('company_valuation'),
  equityPercentage: numeric('equity_percentage'),
  vestingPeriodYears: numeric('vesting_period_years'),
  currency: text('currency').default('USD'),

  // Tier rates
  seniorEngineeringRate: numeric('senior_engineering_rate').default('100000'),
  seniorBusinessRate: numeric('senior_business_rate').default('100000'),
  juniorEngineeringRate: numeric('junior_engineering_rate').default('50000'),
  juniorBusinessRate: numeric('junior_business_rate').default('50000'),
  eaRate: numeric('ea_rate').default('30000'),

  // Settings
  settings: jsonb('settings').default({
    exclusions: ['lunch', 'gym'],
    timezone: 'UTC'
  }),

  // Team composition
  teamComposition: jsonb('team_composition').default({}),

  // Tracking
  freeAuditUsed: boolean('free_audit_used').default(false),
  qaProgress: jsonb('qa_progress').default({}),

  // Notification preferences
  notificationPreferences: jsonb('notification_preferences').default({
    email_audit_ready: true,
    email_weekly_digest: true,
    in_app_audit_ready: true
  })
});

// NextAuth Accounts
export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

// NextAuth Sessions
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// NextAuth Verification Tokens
export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Calendar connections
export const calendarConnections = pgTable('calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').default('google'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: text('scopes').array(),
  hasWriteAccess: boolean('has_write_access').default(false),
  connectedAt: timestamp('connected_at').defaultNow(),
  revokedAt: timestamp('revoked_at')
});

// Audit runs
export const auditRuns = pgTable('audit_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  dateStart: timestamp('date_start', { mode: 'date' }).notNull(),
  dateEnd: timestamp('date_end', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  calendarsIncluded: text('calendars_included').array(),
  exclusionsUsed: text('exclusions_used').array(),
  computedMetrics: jsonb('computed_metrics'),
  planningScore: integer('planning_score'),
  planningAssessment: text('planning_assessment'),
  status: text('status').default('pending'),
  algorithmVersion: text('algorithm_version').default('1.7').notNull(),
  leaveDaysDetected: integer('leave_days_detected').default(0),
  leaveHoursExcluded: numeric('leave_hours_excluded').default('0'),
  frequency: text('frequency').default('manual')
});

// Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  externalEventId: text('external_event_id'),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  durationMinutes: integer('duration_minutes'),
  isAllDay: boolean('is_all_day').default(false),
  calendarId: text('calendar_id'),
  title: text('title'),
  description: text('description'),
  attendeesCount: integer('attendees_count').default(0),
  hasMeetLink: boolean('has_meet_link').default(false),
  isRecurring: boolean('is_recurring').default(false),
  suggestedTier: text('suggested_tier'),
  finalTier: text('final_tier'),
  reconciled: boolean('reconciled').default(false),
  businessArea: text('business_area'),
  vertical: text('vertical'),
  confidenceScore: text('confidence_score'),
  keywordsMatched: text('keywords_matched').array(),
  isLeave: boolean('is_leave').default(false),
  leaveDetectionMethod: text('leave_detection_method'),
  leaveConfidence: text('leave_confidence'),
  planningScore: integer('planning_score'),
  createdAt: timestamp('created_at').defaultNow()
});

// Role recommendations
export const roleRecommendations = pgTable('role_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  roleTitle: text('role_title').notNull(),
  roleTier: text('role_tier').notNull(),
  vertical: text('vertical'),
  businessArea: text('business_area').notNull(),
  hoursPerWeek: numeric('hours_per_week').notNull(),
  costWeekly: numeric('cost_weekly').notNull(),
  costMonthly: numeric('cost_monthly').notNull(),
  costAnnual: numeric('cost_annual').notNull(),
  jdText: text('jd_text'),
  tasksList: jsonb('tasks_list'),
  createdAt: timestamp('created_at').defaultNow()
});

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  tier: text('tier'),
  status: text('status'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  llmBudgetCents: integer('llm_budget_cents'),
  llmSpentCents: integer('llm_spent_cents').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  cancelledAt: timestamp('cancelled_at')
});

// BYOK Keys
export const byokKeys = pgTable('byok_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider'),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  priority: text('priority').default('budget_first'),
  createdAt: timestamp('created_at').defaultNow()
});

// Shared reports
export const sharedReports = pgTable('shared_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  revokedAt: timestamp('revoked_at')
});

// Report access log
export const reportAccessLog = pgTable('report_access_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  sharedReportId: uuid('shared_report_id').references(() => sharedReports.id, { onDelete: 'cascade' }),
  viewerEmail: text('viewer_email').notNull(),
  emailVerified: boolean('email_verified').default(false),
  verificationToken: text('verification_token'),
  accessedAt: timestamp('accessed_at').defaultNow(),
  convertedToSignup: boolean('converted_to_signup').default(false)
});

// Planning sessions
export const planningSessions = pgTable('planning_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id),
  createdAt: timestamp('created_at').defaultNow(),
  sessionType: text('session_type').default('weekly'),
  conversationHistory: jsonb('conversation_history').default([]),
  plannedEvents: jsonb('planned_events').default([]),
  status: text('status').default('active')
});

// Scheduled Audits
export const scheduledAudits = pgTable('scheduled_audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  frequency: text('frequency'),
  dayOfWeek: integer('day_of_week').default(6),
  hour: integer('hour').default(3),
  timezone: text('timezone').default('UTC'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  enabled: boolean('enabled').default(true)
});

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type'),
  title: text('title').notNull(),
  body: text('body'),
  link: text('link'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Contacts
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  contactUserId: uuid('contact_user_id').references(() => users.id),
  contactEmail: text('contact_email'),
  status: text('status').default('pending'),
  invitedAt: timestamp('invited_at').defaultNow(),
  acceptedAt: timestamp('accepted_at')
});
