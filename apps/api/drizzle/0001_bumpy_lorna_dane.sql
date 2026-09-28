ALTER TABLE "messages" ADD COLUMN "sender_source" varchar(20) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "source" varchar(20) DEFAULT 'system' NOT NULL;