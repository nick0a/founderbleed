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
	"planning_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_runs" ADD CONSTRAINT "audit_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE cascade ON UPDATE no action;