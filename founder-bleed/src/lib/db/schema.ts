import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
  integer,
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
