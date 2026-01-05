import { pgTable, uuid, text, timestamp, numeric, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// Users table (Singular table name 'user' required by NextAuth adapter default)
export const users = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  username: text('username'), // Editable display name for personalized reports
  image: text('image'), // Required by NextAuth
  emailVerified: timestamp('emailVerified', { mode: 'date' }), // Required by NextAuth
  createdAt: timestamp('created_at').defaultNow(),

  // Compensation
  salaryAnnual: numeric('salary_annual'),
  salaryInputMode: text('salary_input_mode').default('annual'), // 'annual' | 'hourly'
  companyValuation: numeric('company_valuation'),
  equityPercentage: numeric('equity_percentage'),
  vestingPeriodYears: numeric('vesting_period_years'),
  currency: text('currency').default('USD'),

  // Tier rates (annual)
  // Founder tier rates
  founderUniversalRate: numeric('founder_universal_rate').default('200000'),
  founderEngineeringRate: numeric('founder_engineering_rate').default('180000'),
  founderBusinessRate: numeric('founder_business_rate').default('160000'),
  // Senior tier rates
  seniorUniversalRate: numeric('senior_universal_rate').default('120000'),
  seniorEngineeringRate: numeric('senior_engineering_rate').default('100000'),
  seniorBusinessRate: numeric('senior_business_rate').default('80000'),
  // Junior tier rates
  juniorUniversalRate: numeric('junior_universal_rate').default('50000'),
  juniorEngineeringRate: numeric('junior_engineering_rate').default('40000'),
  juniorBusinessRate: numeric('junior_business_rate').default('50000'),
  // Support tier rates
  eaRate: numeric('ea_rate').default('25000'),

  // Settings
  settings: jsonb('settings').default({
    exclusions: ['lunch', 'gym'],
    timezone: 'UTC'
  }),

  // Team composition
  // Example: {"founder": 1, "senior_engineering": 0, "senior_business": 1, "junior_engineering": 2, "junior_business": 0, "qa_engineer": 0, "ea": 0}
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

// Accounts table (Required by NextAuth)
export const accounts = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

// Sessions table (Required by NextAuth)
export const sessions = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('sessionToken').notNull().unique(),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Verification tokens table (Required by NextAuth)
export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Calendar connections
export const calendarConnections = pgTable('calendar_connection', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').default('google'),
  accessToken: text('access_token').notNull(), // encrypted
  refreshToken: text('refresh_token'), // encrypted
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
  planningScore: integer('planning_score'), // 0-100
  planningAssessment: text('planning_assessment'), // markdown
  status: text('status').default('pending'), // pending, processing, completed, failed
  algorithmVersion: text('algorithm_version').default('1.7').notNull(),
  leaveDaysDetected: integer('leave_days_detected').default(0),
  leaveHoursExcluded: numeric('leave_hours_excluded').default('0'),
  frequency: text('frequency').default('manual') // manual, weekly, monthly, annual
});

// Role recommendations
export const roleRecommendations = pgTable('role_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  roleTitle: text('role_title').notNull(),
  roleTier: text('role_tier').notNull(), // senior, junior, ea
  vertical: text('vertical'), // engineering, business, null for EA
  businessArea: text('business_area').notNull(),
  hoursPerWeek: numeric('hours_per_week').notNull(),
  costWeekly: numeric('cost_weekly').notNull(),
  costMonthly: numeric('cost_monthly').notNull(),
  costAnnual: numeric('cost_annual').notNull(),
  jdText: text('jd_text'), // markdown
  tasksList: jsonb('tasks_list'), // [{task: string, hoursPerWeek: number}]
  createdAt: timestamp('created_at').defaultNow()
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

  // Event category (for filtering non-work events)
  eventCategory: text('event_category').default('work'), // work, leisure, exercise, travel

  // Planning
  planningScore: integer('planning_score'), // 0-100 per event

  createdAt: timestamp('created_at').defaultNow()
});