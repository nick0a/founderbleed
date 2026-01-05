CREATE TABLE "account" (
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
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
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
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"username" text,
	"emailVerified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now(),
	"salary_annual" numeric,
	"salary_input_mode" text DEFAULT 'annual',
	"company_valuation" numeric,
	"equity_percentage" numeric,
	"vesting_period_years" numeric,
	"currency" text DEFAULT 'USD',
	"senior_engineering_rate" numeric DEFAULT '100000',
	"senior_business_rate" numeric DEFAULT '100000',
	"junior_engineering_rate" numeric DEFAULT '50000',
	"junior_business_rate" numeric DEFAULT '50000',
	"ea_rate" numeric DEFAULT '30000',
	"settings" jsonb DEFAULT '{"exclusions":["lunch","gym"],"timezone":"UTC"}'::jsonb,
	"team_composition" jsonb DEFAULT '{}'::jsonb,
	"free_audit_used" boolean DEFAULT false,
	"qa_progress" jsonb DEFAULT '{}'::jsonb,
	"notification_preferences" jsonb DEFAULT '{"email_audit_ready":true,"email_weekly_digest":true,"in_app_audit_ready":true}'::jsonb,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;