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
ALTER TABLE "role_recommendations" ADD CONSTRAINT "role_recommendations_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;