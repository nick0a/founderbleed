CREATE TABLE "byok_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"provider" text,
	"api_key_encrypted" text NOT NULL,
	"priority" text DEFAULT 'budget_first',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"shared_report_id" text,
	"viewer_email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"verification_token" text,
	"accessed_at" timestamp DEFAULT now(),
	"converted_to_signup" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "shared_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_run_id" text,
	"share_token" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"owner_user_id" text,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"tier" text,
	"status" "SubscriptionStatus",
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"llm_budget_cents" integer,
	"llm_spent_cents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"cancelled_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "byok_keys" ADD CONSTRAINT "byok_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_log" ADD CONSTRAINT "report_access_log_shared_report_id_shared_reports_id_fk" FOREIGN KEY ("shared_report_id") REFERENCES "public"."shared_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_reports" ADD CONSTRAINT "shared_reports_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_reports" ADD CONSTRAINT "shared_reports_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shared_reports_share_token_idx" ON "shared_reports" USING btree ("share_token");