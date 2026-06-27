CREATE TABLE "admin_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"granted_by_uid" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_roles_uid_role_idx" ON "admin_roles" USING btree ("firebase_uid","role");--> statement-breakpoint
CREATE INDEX "admin_roles_uid_idx" ON "admin_roles" USING btree ("firebase_uid");