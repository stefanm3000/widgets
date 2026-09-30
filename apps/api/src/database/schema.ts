import {
  bigserial,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { MessageSource } from "@pulse/protocol";

export const rooms = pgTable("rooms", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 280 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const channels = pgTable(
  "channels",
  {
    roomId: varchar("room_id", { length: 128 })
      .primaryKey()
      .references(() => rooms.id, { onDelete: "cascade" }),
    parentRoomId: varchar("parent_room_id", { length: 128 })
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
  },
  (table) => [index("channels_parent_room_idx").on(table.parentRoomId)],
);

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey(),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  source: varchar("source", { length: 20 })
    .$type<MessageSource>()
    .default("system")
    .notNull(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey(),
    clientMessageId: uuid("client_message_id").notNull(),
    roomId: varchar("room_id", { length: 128 })
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => participants.id),
    senderDisplayName: varchar("sender_display_name", { length: 80 }).notNull(),
    senderSource: varchar("sender_source", { length: 20 })
      .$type<MessageSource>()
      .default("system")
      .notNull(),
    body: varchar("body", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("messages_sender_client_id_unique").on(
      table.roomId,
      table.senderId,
      table.clientMessageId,
    ),
    index("messages_room_created_at_idx").on(
      table.roomId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const realtimeEvents = pgTable(
  "realtime_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    roomId: varchar("room_id", { length: 128 })
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).$type<"message.created">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("realtime_events_message_id_unique").on(table.messageId),
    index("realtime_events_room_id_idx").on(table.roomId, table.id),
  ],
);
