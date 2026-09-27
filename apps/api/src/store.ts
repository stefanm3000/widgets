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

import { demoRoom, seededMessages } from "./data/demo-chat.js";
import { parseCursor } from "./helpers/cursor.js";

export class MemoryChatStore {
  private readonly rooms = new Map([[demoRoom.id, demoRoom]]);
  private readonly messages = new Map([
    [demoRoom.id, structuredClone(seededMessages)],
  ]);
  private readonly events: RealtimeEvent[] = seededMessages.map(
    (message, index) => ({
      eventId: String(index + 1),
      roomId: demoRoom.id,
      type: "message.created",
      payload: structuredClone(message),
    }),
  );
  private readonly listeners = new Map<
    string,
    Set<(event: RealtimeEvent) => void>
  >();
  private nextEventId = BigInt(this.events.length + 1);

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getMessages(roomId: string, query: HistoryQuery): MessagePage | null {
    const messages = this.messages.get(roomId);
    if (!messages) return null;

    const end = parseCursor(query.cursor, messages.length);
    if (end === null) return null;
    const start = Math.max(0, end - query.limit);

    return {
      items: messages.slice(start, end),
      nextCursor: start > 0 ? String(start) : null,
    };
  }

  getCurrentCursor(roomId: string): string | null {
    return (
      this.events.filter((event) => event.roomId === roomId).at(-1)?.eventId ??
      null
    );
  }

  getEventsAfter(
    roomId: string,
    cursor: string,
  ): { events: RealtimeEvent[]; expired: boolean } {
    if (!/^\d+$/.test(cursor)) return { events: [], expired: true };

    const requested = BigInt(cursor);
    const roomEvents = this.events.filter((event) => event.roomId === roomId);
    const oldest = roomEvents[0];
    const latest = roomEvents.at(-1);
    if (!oldest || !latest) return { events: [], expired: requested !== 0n };

    const oldestId = BigInt(oldest.eventId);
    const latestId = BigInt(latest.eventId);
    if (requested < oldestId - 1n || requested > latestId) {
      return { events: [], expired: true };
    }

    return {
      events: roomEvents.filter((event) => BigInt(event.eventId) > requested),
      expired: false,
    };
  }

  subscribe(
    roomId: string,
    listener: (event: RealtimeEvent) => void,
  ): () => void {
    const listeners = this.listeners.get(roomId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(roomId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(roomId);
    };
  }

  addMessage(
    roomId: string,
    sender: Participant,
    input: SendMessageRequest,
  ): { created: boolean; message: Message } | null {
    const messages = this.messages.get(roomId);
    if (!messages) return null;

    const existing = messages.find(
      (message) =>
        message.sender.id === sender.id &&
        message.clientMessageId === input.clientMessageId,
    );
    if (existing) return { created: false, message: existing };

    const message: Message = {
      id: randomUUID(),
      clientMessageId: input.clientMessageId,
      roomId,
      sender,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    messages.push(message);
    const event: RealtimeEvent = {
      eventId: String(this.nextEventId),
      roomId,
      type: "message.created",
      payload: message,
    };
    this.nextEventId += 1n;
    this.events.push(event);
    for (const listener of this.listeners.get(roomId) ?? []) listener(event);

    return { created: true, message };
  }
}
