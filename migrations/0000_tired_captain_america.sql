CREATE TABLE "analytics_daily_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"page" text NOT NULL,
	"unique_users" integer DEFAULT 0 NOT NULL,
	"total_page_views" integer DEFAULT 0 NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"avg_scroll_depth" integer DEFAULT 0 NOT NULL,
	"avg_time_spent" integer DEFAULT 0 NOT NULL,
	"top_elements" jsonb
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_id" text NOT NULL,
	"event_type" text NOT NULL,
	"page" text NOT NULL,
	"element_id" text,
	"element_text" text,
	"value" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"od_user_id" text NOT NULL,
	"quiz_id" integer NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_count" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"video_url" text,
	"audio_url" text,
	"image_urls" text[],
	"publish_date" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"group_name" text,
	"episode_number" integer,
	"show_in_upcoming" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ran_at" timestamp DEFAULT now() NOT NULL,
	"checked_count" integer DEFAULT 0 NOT NULL,
	"acked_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"od_user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"admin_reply" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"replied_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"od_user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_summary_date_page_idx" ON "analytics_daily_summary" USING btree ("date","page");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_user_quiz_idx" ON "quiz_attempts" USING btree ("od_user_id","quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_completed_idx" ON "quiz_attempts" USING btree ("od_user_id","completed_at");--> statement-breakpoint
CREATE INDEX "quizzes_publish_date_idx" ON "quizzes" USING btree ("publish_date");--> statement-breakpoint
CREATE INDEX "quizzes_group_name_idx" ON "quizzes" USING btree ("group_name");--> statement-breakpoint
CREATE INDEX "reconciliation_logs_ran_at_idx" ON "reconciliation_logs" USING btree ("ran_at");--> statement-breakpoint
CREATE INDEX "support_messages_user_type_idx" ON "support_messages" USING btree ("od_user_id","type");--> statement-breakpoint
CREATE INDEX "support_messages_status_idx" ON "support_messages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_idx" ON "user_badges" USING btree ("od_user_id","badge_id");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("od_user_id");