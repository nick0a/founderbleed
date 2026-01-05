CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "calendar_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text DEFAULT 'google',
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" text[],
	"has_write_access" boolean DEFAULT false,
	"connected_at" timestamp DEFAULT now(),
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "session_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"username" text,
	"image" text,
	"emailVerified" timestamp,
	"created_at" timestamp DEFAULT now(),
	"salary_annual" numeric,
	"salary_input_mode" text DEFAULT 'annual',
	"company_valuation" numeric,
	"equity_percentage" numeric,
	"vesting_period_years" numeric,
	"currency" text DEFAULT 'USD',
	"senior_engineering_rate" numeric DEFAULT '100000',
	"senior_business_rate" numeric DEFAULT '80000',
	"junior_engineering_rate" numeric DEFAULT '40000',
	"junior_business_rate" numeric DEFAULT '50000',
	"ea_rate" numeric DEFAULT '25000',
	"settings" jsonb DEFAULT '{"exclusions":["lunch","gym"],"timezone":"UTC"}'::jsonb,
	"team_composition" jsonb DEFAULT '{}'::jsonb,
	"free_audit_used" boolean DEFAULT false,
	"qa_progress" jsonb DEFAULT '{}'::jsonb,
	"notification_preferences" jsonb DEFAULT '{"email_audit_ready":true,"email_weekly_digest":true,"in_app_audit_ready":true}'::jsonb,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connection" ADD CONSTRAINT "calendar_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;