import { randomUUID } from "node:crypto";

import type {
  HistoryQuery,
  Message,
  MessagePage,
  Participant,
  RealtimeEvent,
  Room,
  SendMessageRequest,
} from "@pulse/protocol";
import { and, asc, count, desc, eq, gt } from "drizzle-orm";
import type { Pool } from "pg";

import { createDatabase, type PulseDatabase } from "../database/client.js";
import {
  messages,
  participants,
  realtimeEvents,
  rooms,
} from "../database/schema.js";
import { parseCursor } from "../helpers/cursor.js";
import type { AddMessageResult, ChatStore, EventReplay } from "./chat-store.js";
import { RoomEventListeners } from "./listeners.js";

type MessageRecord = typeof messages.$inferSelect;

function toMessage(record: MessageRecord): Message {
  return {
    id: record.id,
    clientMessageId: record.clientMessageId,
    roomId: record.roomId,
    sender: {
      id: record.senderId,
      displayName: record.senderDisplayName,
      source: record.senderSource,
    },
    body: record.body,
    createdAt: record.createdAt.toISOString(),
  };
}

function toRoom(record: typeof rooms.$inferSelect): Room {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
  };
}

const eventSelection = {
  eventId: realtimeEvents.id,
  message: messages,
  roomId: realtimeEvents.roomId,
  type: realtimeEvents.type,
};

function toEvent(record: {
  eventId: bigint;
  message: MessageRecord;
  roomId: string;
  type: "message.created";
}): RealtimeEvent {
  return {
    eventId: record.eventId.toString(),
    roomId: record.roomId,
    type: record.type,
    payload: toMessage(record.message),
  };
}

export class PostgresChatStore implements ChatStore {
  private readonly database: PulseDatabase;
  private readonly eventListeners = new RoomEventListeners();

  constructor(private readonly pool: Pool) {
    this.database = createDatabase(pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const [room] = await this.database
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    return room ? toRoom(room) : undefined;
  }

  async getMessages(
    roomId: string,
    query: HistoryQuery,
  ): Promise<MessagePage | null> {
    const [room, messageCountResult] = await Promise.all([
      this.getRoom(roomId),
      this.database
        .select({ value: count() })
        .from(messages)
        .where(eq(messages.roomId, roomId)),
    ]);
    if (!room) return null;
    const messageCount = messageCountResult[0]?.value ?? 0;

    const end = parseCursor(query.cursor, messageCount);
    if (end === null) return null;
    const start = Math.max(0, end - query.limit);

    const records = await this.database
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(asc(messages.createdAt), asc(messages.id))
      .limit(end - start)
      .offset(start);

    return {
      items: records.map(toMessage),
      nextCursor: start > 0 ? String(start) : null,
    };
  }

  async getCurrentCursor(roomId: string): Promise<string | null> {
    const [event] = await this.database
      .select({ id: realtimeEvents.id })
      .from(realtimeEvents)
      .where(eq(realtimeEvents.roomId, roomId))
      .orderBy(desc(realtimeEvents.id))
      .limit(1);
    return event?.id.toString() ?? null;
  }

  async getEventsAfter(roomId: string, cursor: string): Promise<EventReplay> {
    if (!/^\d+$/.test(cursor)) return { events: [], expired: true };
    const requested = BigInt(cursor);

    const [oldestResult, latestResult] = await Promise.all([
      this.database
        .select({ id: realtimeEvents.id })
        .from(realtimeEvents)
        .where(eq(realtimeEvents.roomId, roomId))
        .orderBy(asc(realtimeEvents.id))
        .limit(1),
      this.database
        .select({ id: realtimeEvents.id })
        .from(realtimeEvents)
        .where(eq(realtimeEvents.roomId, roomId))
        .orderBy(desc(realtimeEvents.id))
        .limit(1),
    ]);
    const oldest = oldestResult[0]?.id;
    const latest = latestResult[0]?.id;

    if (oldest === undefined || latest === undefined) {
      return { events: [], expired: requested !== 0n };
    }
    if (requested < oldest - 1n || requested > latest) {
      return { events: [], expired: true };
    }

    const records = await this.database
      .select(eventSelection)
      .from(realtimeEvents)
      .innerJoin(messages, eq(messages.id, realtimeEvents.messageId))
      .where(
        and(
          eq(realtimeEvents.roomId, roomId),
          gt(realtimeEvents.id, requested),
        ),
      )
      .orderBy(asc(realtimeEvents.id));

    return { events: records.map(toEvent), expired: false };
  }

  subscribe(
    roomId: string,
    listener: (event: RealtimeEvent) => void,
  ): () => void {
    return this.eventListeners.subscribe(roomId, listener);
  }

  async addMessage(
    roomId: string,
    sender: Participant,
    input: SendMessageRequest,
  ): Promise<AddMessageResult | null> {
    const outcome = await this.database.transaction(async (transaction) => {
      const [room] = await transaction
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1);
      if (!room) return null;

      await transaction
        .insert(participants)
        .values(sender)
        .onConflictDoUpdate({
          target: participants.id,
          set: {
            displayName: sender.displayName,
            source: sender.source,
          },
        });

      const [existing] = await transaction
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.roomId, roomId),
            eq(messages.senderId, sender.id),
            eq(messages.clientMessageId, input.clientMessageId),
          ),
        )
        .limit(1);
      if (existing) {
        return {
          event: null,
          result: { created: false, message: toMessage(existing) },
        };
      }

      const [inserted] = await transaction
        .insert(messages)
        .values({
          id: randomUUID(),
          clientMessageId: input.clientMessageId,
          roomId,
          senderId: sender.id,
          senderDisplayName: sender.displayName,
          senderSource: sender.source,
          body: input.body,
          createdAt: new Date(),
        })
        .onConflictDoNothing({
          target: [
            messages.roomId,
            messages.senderId,
            messages.clientMessageId,
          ],
        })
        .returning();

      if (!inserted) {
        const [concurrentMessage] = await transaction
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.roomId, roomId),
              eq(messages.senderId, sender.id),
              eq(messages.clientMessageId, input.clientMessageId),
            ),
          )
          .limit(1);
        if (!concurrentMessage) {
          throw new Error("Idempotent message lookup failed");
        }
        return {
          event: null,
          result: { created: false, message: toMessage(concurrentMessage) },
        };
      }

      const [event] = await transaction
        .insert(realtimeEvents)
        .values({
          roomId,
          messageId: inserted.id,
          type: "message.created",
          createdAt: inserted.createdAt,
        })
        .returning({ id: realtimeEvents.id });
      if (!event) throw new Error("Realtime event insert failed");

      const message = toMessage(inserted);
      return {
        event: {
          eventId: event.id.toString(),
          roomId,
          type: "message.created" as const,
          payload: message,
        },
        result: { created: true, message },
      };
    });

    if (outcome?.event) this.eventListeners.emit(outcome.event);
    return outcome?.result ?? null;
  }
}
