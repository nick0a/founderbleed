CREATE TABLE "audit_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"date_start" timestamp NOT NULL,
	"date_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"calendars_included" text[],
	"exclusions_used" text[],
	"computed_metrics" jsonb,
	"planning_score" integer,
	"planning_assessment" text,
	"status" text DEFAULT 'pending',
	"algorithm_version" text DEFAULT '1.7' NOT NULL,
	"leave_days_detected" integer DEFAULT 0,
	"leave_hours_excluded" numeric DEFAULT '0',
	"frequency" text DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE "byok_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text,
	"api_key_encrypted" text NOT NULL,
	"priority" text DEFAULT 'budget_first',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_run_id" uuid,
	"external_event_id" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"duration_minutes" integer,
	"is_all_day" boolean DEFAULT false,
	"calendar_id" text,
	"title" text,
	"description" text,
	"attendees_count" integer DEFAULT 0,
	"has_meet_link" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"suggested_tier" text,
	"final_tier" text,
	"reconciled" boolean DEFAULT false,
	"business_area" text,
	"vertical" text,
	"confidence_score" text,
	"keywords_matched" text[],
	"is_leave" boolean DEFAULT false,
	"leave_detection_method" text,
	"leave_confidence" text,
	"event_category" text DEFAULT 'work',
	"planning_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shared_report_id" uuid,
	"viewer_email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"verification_token" text,
	"accessed_at" timestamp DEFAULT now(),
	"converted_to_signup" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "role_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_run_id" uuid,
	"role_title" text NOT NULL,
	"role_tier" text NOT NULL,
	"vertical" text,
	"business_area" text NOT NULL,
	"hours_per_week" numeric NOT NULL,
	"cost_weekly" numeric NOT NULL,
	"cost_monthly" numeric NOT NULL,
	"cost_annual" numeric NOT NULL,
	"jd_text" text,
	"tasks_list" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shared_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_run_id" uuid,
	"share_token" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"owner_user_id" uuid,
	"revoked_at" timestamp,
	CONSTRAINT "shared_reports_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"tier" text,
	"status" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"llm_budget_cents" integer,
	"llm_spent_cents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"cancelled_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "founder_universal_rate" numeric DEFAULT '200000';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "founder_engineering_rate" numeric DEFAULT '180000';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "founder_business_rate" numeric DEFAULT '160000';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "senior_universal_rate" numeric DEFAULT '120000';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "junior_universal_rate" numeric DEFAULT '50000';--> statement-breakpoint
ALTER TABLE "audit_runs" ADD CONSTRAINT "audit_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "byok_keys" ADD CONSTRAINT "byok_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_log" ADD CONSTRAINT "report_access_log_shared_report_id_shared_reports_id_fk" FOREIGN KEY ("shared_report_id") REFERENCES "public"."shared_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_recommendations" ADD CONSTRAINT "role_recommendations_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_reports" ADD CONSTRAINT "shared_reports_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_reports" ADD CONSTRAINT "shared_reports_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;