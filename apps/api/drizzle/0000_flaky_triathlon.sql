CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_message_id" uuid NOT NULL,
	"room_id" varchar(128) NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_display_name" varchar(80) NOT NULL,
	"body" varchar(500) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(80) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "realtime_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"room_id" varchar(128) NOT NULL,
	"message_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(280),
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_participants_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realtime_events" ADD CONSTRAINT "realtime_events_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realtime_events" ADD CONSTRAINT "realtime_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "messages_sender_client_id_unique" ON "messages" USING btree ("room_id","sender_id","client_message_id");--> statement-breakpoint
CREATE INDEX "messages_room_created_at_idx" ON "messages" USING btree ("room_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "realtime_events_message_id_unique" ON "realtime_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "realtime_events_room_id_idx" ON "realtime_events" USING btree ("room_id","id");