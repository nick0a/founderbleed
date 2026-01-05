CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" text,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "planning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"audit_run_id" uuid,
	"title" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"session_type" text DEFAULT 'weekly',
	"conversation_history" jsonb DEFAULT '[]'::jsonb,
	"planned_events" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active',
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scheduled_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"frequency" text,
	"day_of_week" integer DEFAULT 6,
	"hour" integer DEFAULT 3,
	"timezone" text DEFAULT 'UTC',
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_sessions" ADD CONSTRAINT "planning_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_sessions" ADD CONSTRAINT "planning_sessions_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_audits" ADD CONSTRAINT "scheduled_audits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;