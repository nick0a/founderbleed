CREATE TABLE "planning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"audit_run_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"session_type" text DEFAULT 'weekly',
	"conversation_history" jsonb DEFAULT '[]'::jsonb,
	"planned_events" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
ALTER TABLE "planning_sessions" ADD CONSTRAINT "planning_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_sessions" ADD CONSTRAINT "planning_sessions_audit_run_id_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."audit_runs"("id") ON DELETE no action ON UPDATE no action;