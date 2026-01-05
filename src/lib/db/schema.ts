// Database schema for Founder Bleed
// Using Drizzle ORM with PostgreSQL

import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
  integer,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// ============================================
// NextAuth Required Tables
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  name: text('name'),
  username: text('username'), // Editable display name for personalized reports
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Compensation
  salaryAnnual: numeric('salary_annual'),
  salaryInputMode: text('salary_input_mode').default('annual'), // 'annual' | 'hourly'
  companyValuation: numeric('company_valuation'),
  equityPercentage: numeric('equity_percentage'),
  vestingPeriodYears: numeric('vesting_period_years'),
  currency: text('currency').default('USD'),

  // Tier rates (annual)
  seniorEngineeringRate: numeric('senior_engineering_rate').default('100000'),
  seniorBusinessRate: numeric('senior_business_rate').default('100000'),
  juniorEngineeringRate: numeric('junior_engineering_rate').default('50000'),
  juniorBusinessRate: numeric('junior_business_rate').default('50000'),
  eaRate: numeric('ea_rate').default('30000'),

  // Settings
  settings: jsonb('settings').default({
    exclusions: ['lunch', 'gym'],
    timezone: 'UTC',
  }),

  // Team composition
  // Example: {"founder": 1, "senior_engineering": 0, "senior_business": 1, "junior_engineering": 2, "junior_business": 0, "qa_engineer": 0, "ea": 0}
  teamComposition: jsonb('team_composition').default({ founder: 1 }),

  // Tracking
  freeAuditUsed: boolean('free_audit_used').default(false),
  qaProgress: jsonb('qa_progress').default({}),

  // Notification preferences
  notificationPreferences: jsonb('notification_preferences').default({
    email_audit_ready: true,
    email_weekly_digest: true,
    in_app_audit_ready: true,
  }),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// ============================================
// Calendar Connections
// ============================================

export const calendarConnections = pgTable('calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').default('google'),
  accessToken: text('access_token').notNull(), // encrypted
  refreshToken: text('refresh_token'), // encrypted
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: text('scopes').array(),
  hasWriteAccess: boolean('has_write_access').default(false),
  connectedAt: timestamp('connected_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
});

// ============================================
// Audits (Audit Runs)
// ============================================

export const audits = pgTable('audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  dateStart: timestamp('date_start', { mode: 'date' }).notNull(),
  dateEnd: timestamp('date_end', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  calendarsIncluded: text('calendars_included').array(),
  exclusionsUsed: text('exclusions_used').array(),
  computedMetrics: jsonb('computed_metrics'),
  planningScore: integer('planning_score'), // 0-100
  planningAssessment: text('planning_assessment'), // markdown
  status: text('status').default('pending'), // pending, processing, completed, failed
  algorithmVersion: text('algorithm_version').default('1.7').notNull(),
  leaveDaysDetected: integer('leave_days_detected').default(0),
  leaveHoursExcluded: numeric('leave_hours_excluded').default('0'),
  frequency: text('frequency').default('manual'), // manual, weekly, monthly, annual
  completedAt: timestamp('completed_at'),
});

// ============================================
// Events (Calendar Events)
// ============================================

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditId: uuid('audit_id')
    .notNull()
    .references(() => audits.id, { onDelete: 'cascade' }),
  externalEventId: text('external_event_id'),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  durationMinutes: integer('duration_minutes'),
  isAllDay: boolean('is_all_day').default(false),
  calendarId: text('calendar_id'),
  title: text('title'), // encrypted
  description: text('description'), // encrypted
  attendeesCount: integer('attendees_count').default(0),
  hasMeetLink: boolean('has_meet_link').default(false),
  isRecurring: boolean('is_recurring').default(false),

  // Classification
  suggestedTier: text('suggested_tier'), // unique, founder, senior, junior, ea
  finalTier: text('final_tier'),
  reconciled: boolean('reconciled').default(false),
  businessArea: text('business_area'),
  vertical: text('vertical'), // engineering, business
  confidenceScore: text('confidence_score'), // high, medium, low
  keywordsMatched: text('keywords_matched').array(),

  // Leave detection
  isLeave: boolean('is_leave').default(false),
  leaveDetectionMethod: text('leave_detection_method'),
  leaveConfidence: text('leave_confidence'), // high, medium, low

  // Planning
  planningScore: integer('planning_score'), // 0-100 per event

  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// Subscriptions (Stripe)
// ============================================

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').default('free'), // free, starter, team, pro
  status: text('status').default('active'), // active, canceled, past_due, trialing
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// Share Links
// ============================================

export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditId: uuid('audit_id')
    .notNull()
    .references(() => audits.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const shareLinkViews = pgTable('share_link_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  shareLinkId: uuid('share_link_id')
    .notNull()
    .references(() => shareLinks.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  viewedAt: timestamp('viewed_at').defaultNow(),
});

// ============================================
// Contacts
// ============================================

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  company: text('company'),
  category: text('category'), // investor, customer, team, vendor, other
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// Planning Conversations (AI Assistant)
// ============================================

export const planningConversations = pgTable('planning_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  messages: jsonb('messages').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type PlanningConversation = typeof planningConversations.$inferSelect;
