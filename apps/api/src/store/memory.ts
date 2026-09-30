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

import { demoRoom, seededMessages } from "../data/demo-chat.js";
import { parseCursor } from "../helpers/cursor.js";
import type { AddMessageResult, ChatStore, EventReplay } from "./chat-store.js";
import { RoomEventListeners } from "./listeners.js";

export class MemoryChatStore implements ChatStore {
  private readonly channelParents = new Map<string, string>();
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
  private readonly eventListeners = new RoomEventListeners();
  private nextEventId = BigInt(this.events.length + 1);

  async getParentRoomId(roomId: string): Promise<string | undefined> {
    return this.channelParents.get(roomId);
  }

  async listChannels(parentRoomId: string): Promise<Room[]> {
    return [...this.rooms.values()].filter(
      (room) => this.channelParents.get(room.id) === parentRoomId,
    );
  }

  async createChannel(parentRoomId: string, name: string): Promise<Room> {
    if (!this.rooms.has(parentRoomId)) throw new Error("Parent room not found");
    const room: Room = {
      id: randomUUID(),
      name,
      description: null,
      createdAt: new Date().toISOString(),
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    this.channelParents.set(room.id, parentRoomId);
    return room;
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    return this.rooms.get(roomId);
  }

  async getMessages(
    roomId: string,
    query: HistoryQuery,
  ): Promise<MessagePage | null> {
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

  async getCurrentCursor(roomId: string): Promise<string | null> {
    return (
      this.events.filter((event) => event.roomId === roomId).at(-1)?.eventId ??
      null
    );
  }

  async getEventsAfter(roomId: string, cursor: string): Promise<EventReplay> {
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
    return this.eventListeners.subscribe(roomId, listener);
  }

  async addMessage(
    roomId: string,
    sender: Participant,
    input: SendMessageRequest,
  ): Promise<AddMessageResult | null> {
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
    this.eventListeners.emit(event);

    return { created: true, message };
  }
}
