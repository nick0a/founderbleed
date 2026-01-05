import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
  integer,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const auditStatusEnum = pgEnum("AuditStatus", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const eventTierEnum = pgEnum("EventTier", [
  "UNCLASSIFIED",
  "UNIQUE",
  "FOUNDER",
  "SENIOR",
  "JUNIOR",
  "EA",
]);

export const subscriptionStatusEnum = pgEnum("SubscriptionStatus", [
  "ACTIVE",
  "CANCELED",
  "PAST_DUE",
  "INCOMPLETE",
  "TRIALING",
]);

export const subscriptionTierEnum = pgEnum("SubscriptionTier", [
  "FREE",
  "PRO",
  "TEAM",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  username: text("username"),
  salaryAnnual: integer("annual_salary"),
  salaryInputMode: text("salary_input_mode").default("annual"),
  companyValuation: numeric("company_valuation"),
  equityPercentage: numeric("equity_percentage"),
  vestingPeriodYears: numeric("vesting_period_years"),
  currency: text("currency").default("USD"),
  region: text("region"),
  timezone: text("timezone"),
  teamFounders: integer("team_founders"),
  teamSize: integer("team_size"),
  seniorEngineeringRate: numeric("senior_engineering_rate").default("100000"),
  seniorBusinessRate: numeric("senior_business_rate").default("100000"),
  juniorEngineeringRate: numeric("junior_engineering_rate").default("50000"),
  juniorBusinessRate: numeric("junior_business_rate").default("50000"),
  eaRate: numeric("ea_rate").default("30000"),
  settings: jsonb("settings").default({
    exclusions: ["lunch", "gym"],
    timezone: "UTC",
  }),
  teamComposition: jsonb("team_composition").default({}),
  freeAuditUsed: boolean("free_audit_used").default(false),
  qaProgress: jsonb("qa_progress").default({}),
  notificationPreferences: jsonb("notification_preferences").default({
    email_audit_ready: true,
    email_weekly_digest: true,
    in_app_audit_ready: true,
  }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
});

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").default("google"),
    calendarId: text("calendar_id"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    isActive: boolean("is_active").default(true),
    lastSyncAt: timestamp("last_sync_at"),
    scopes: text("scopes").array(),
    hasWriteAccess: boolean("has_write_access").default(false),
    connectedAt: timestamp("connected_at").defaultNow(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userProviderIdx: uniqueIndex("calendar_connections_user_provider_idx").on(
      table.userId,
      table.provider
    ),
  })
);

export const auditRuns = pgTable("audit_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  algorithmVersion: text("algorithm_version").default("1.7"),
  status: auditStatusEnum("status").default("PENDING"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  totalEvents: integer("total_events"),
  totalHours: doublePrecision("total_hours"),
  uniqueHours: doublePrecision("unique_hours"),
  founderHours: doublePrecision("founder_hours"),
  seniorHours: doublePrecision("senior_hours"),
  juniorHours: doublePrecision("junior_hours"),
  eaHours: doublePrecision("ea_hours"),
  planningScore: doublePrecision("planning_score"),
  annualLoss: doublePrecision("annual_loss"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  completedAt: timestamp("completed_at"),
  calendarsIncluded: text("calendars_included").array(),
  exclusionsUsed: text("exclusions_used").array(),
  computedMetrics: jsonb("computed_metrics"),
  planningAssessment: text("planning_assessment"),
  leaveDaysDetected: integer("leave_days_detected").default(0),
  leaveHoursExcluded: numeric("leave_hours_excluded").default("0"),
  frequency: text("frequency").default("manual"),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  auditRunId: text("audit_run_id").references(() => auditRuns.id, {
    onDelete: "cascade",
  }),
  externalEventId: text("external_id"),
  title: text("title"),
  description: text("description"),
  startAt: timestamp("start_time"),
  endAt: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  finalTier: eventTierEnum("tier"),
  tierConfidence: doublePrecision("tier_confidence"),
  reconciled: boolean("is_manual_override").default(false),
  attendeesCount: integer("attendee_count").default(0),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  isAllDay: boolean("is_all_day").default(false),
  calendarId: text("calendar_id"),
  hasMeetLink: boolean("has_meet_link").default(false),
  suggestedTier: text("suggested_tier"),
  businessArea: text("business_area"),
  vertical: text("vertical"),
  confidenceScore: text("confidence_score"),
  keywordsMatched: text("keywords_matched").array(),
  isLeave: boolean("is_leave").default(false),
  leaveDetectionMethod: text("leave_detection_method"),
  leaveConfidence: text("leave_confidence"),
  planningScore: integer("planning_score"),
});

export const roleRecommendations = pgTable("role_recommendations", {
  id: text("id").primaryKey(),
  auditRunId: text("audit_run_id").references(() => auditRuns.id, {
    onDelete: "cascade",
  }),
  roleTitle: text("role_title").notNull(),
  roleTier: text("role_tier").notNull(),
  vertical: text("vertical"),
  businessArea: text("business_area").notNull(),
  hoursPerWeek: numeric("hours_per_week").notNull(),
  costWeekly: numeric("cost_weekly").notNull(),
  costMonthly: numeric("cost_monthly").notNull(),
  costAnnual: numeric("cost_annual").notNull(),
  jdText: text("jd_text"),
  tasksList: jsonb("tasks_list"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  tier: text("tier"),
  status: subscriptionStatusEnum("status"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  llmBudgetCents: integer("llm_budget_cents"),
  llmSpentCents: integer("llm_spent_cents").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
});

export const byokKeys = pgTable("byok_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider"),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  priority: text("priority").default("budget_first"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedReports = pgTable(
  "shared_reports",
  {
    id: text("id").primaryKey(),
    auditRunId: text("audit_run_id").references(() => auditRuns.id, {
      onDelete: "cascade",
    }),
    shareToken: text("share_token").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    ownerUserId: text("owner_user_id").references(() => users.id),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    shareTokenIdx: uniqueIndex("shared_reports_share_token_idx").on(
      table.shareToken
    ),
  })
);

export const reportAccessLog = pgTable("report_access_log", {
  id: text("id").primaryKey(),
  sharedReportId: text("shared_report_id").references(() => sharedReports.id, {
    onDelete: "cascade",
  }),
  viewerEmail: text("viewer_email").notNull(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  accessedAt: timestamp("accessed_at").defaultNow(),
  convertedToSignup: boolean("converted_to_signup").default(false),
});

export const planningSessions = pgTable("planning_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  auditRunId: text("audit_run_id").references(() => auditRuns.id),
  createdAt: timestamp("created_at").defaultNow(),
  sessionType: text("session_type").default("weekly"),
  conversationHistory: jsonb("conversation_history").default([]),
  plannedEvents: jsonb("planned_events").default([]),
  status: text("status").default("active"),
});

export const scheduledAudits = pgTable("scheduled_audits", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  frequency: text("frequency"),
  dayOfWeek: integer("day_of_week").default(6),
  hour: integer("hour").default(3),
  timezone: text("timezone").default("UTC"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  enabled: boolean("enabled").default(true),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
