CREATE TYPE "public"."AuditStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."EventTier" AS ENUM('UNCLASSIFIED', 'UNIQUE', 'FOUNDER', 'SENIOR', 'JUNIOR', 'EA');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionStatus" AS ENUM('ACTIVE', 'CANCELED', 'PAST_DUE', 'INCOMPLETE', 'TRIALING');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionTier" AS ENUM('FREE', 'PRO', 'TEAM');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'google',
	"calendar_id" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"scopes" text[],
	"has_write_access" boolean DEFAULT false,
	"connected_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"email_verified" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	"username" text,
	"annual_salary" integer,
	"salary_input_mode" text DEFAULT 'annual',
	"company_valuation" numeric,
	"equity_percentage" numeric,
	"vesting_period_years" numeric,
	"currency" text DEFAULT 'USD',
	"region" text,
	"timezone" text,
	"team_founders" integer,
	"team_size" integer,
	"senior_engineering_rate" numeric DEFAULT '100000',
	"senior_business_rate" numeric DEFAULT '100000',
	"junior_engineering_rate" numeric DEFAULT '50000',
	"junior_business_rate" numeric DEFAULT '50000',
	"ea_rate" numeric DEFAULT '30000',
	"settings" jsonb DEFAULT '{"exclusions":["lunch","gym"],"timezone":"UTC"}'::jsonb,
	"team_composition" jsonb DEFAULT '{}'::jsonb,
	"free_audit_used" boolean DEFAULT false,
	"qa_progress" jsonb DEFAULT '{}'::jsonb,
	"notification_preferences" jsonb DEFAULT '{"email_audit_ready":true,"email_weekly_digest":true,"in_app_audit_ready":true}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_user_provider_idx" ON "calendar_connections" USING btree ("user_id","provider");