CREATE TABLE "channels" (
	"room_id" varchar(128) PRIMARY KEY NOT NULL,
	"parent_room_id" varchar(128) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_parent_room_id_rooms_id_fk" FOREIGN KEY ("parent_room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_parent_room_idx" ON "channels" USING btree ("parent_room_id");