CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"type" text,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"frequency" text,
	"day_of_week" integer DEFAULT 6,
	"hour" integer DEFAULT 3,
	"timezone" text DEFAULT 'UTC',
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"enabled" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_audits" ADD CONSTRAINT "scheduled_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;