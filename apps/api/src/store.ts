import { randomUUID } from "node:crypto";

import type {
  HistoryQuery,
  Message,
  MessagePage,
  Participant,
  Room,
  SendMessageRequest,
} from "@pulse/protocol";

const demoRoom: Room = {
  id: "demo-room",
  name: "Live chat demo",
  description: "A shared room for testing the Pulse SDK and widget.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const systemParticipant: Participant = {
  id: "7bb92b54-0593-471e-819a-f85ab7089279",
  displayName: "Pulse Demo",
};

const seededMessages: Message[] = [
  {
    id: "017e106e-e16b-4af7-be34-bcdedd50d1a1",
    clientMessageId: "ea81cc51-bf45-4802-8ca8-9df196821694",
    roomId: demoRoom.id,
    sender: systemParticipant,
    body: "Welcome to the live chat demo.",
    createdAt: "2026-01-01T00:00:01.000Z",
  },
  {
    id: "58257dad-d21b-475f-be69-fabc5e6dcad1",
    clientMessageId: "834509ba-a906-40ed-9f81-2b499bcaa588",
    roomId: demoRoom.id,
    sender: systemParticipant,
    body: "Open another client later to test realtime delivery.",
    createdAt: "2026-01-01T00:00:02.000Z",
  },
];

function parseCursor(
  cursor: string | undefined,
  messageCount: number,
): number | null {
  if (!cursor) return messageCount;
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0 || value > messageCount)
    return null;
  return value;
}

export class MemoryChatStore {
  private readonly rooms = new Map([[demoRoom.id, demoRoom]]);
  private readonly messages = new Map([
    [demoRoom.id, structuredClone(seededMessages)],
  ]);

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

  addMessage(
    roomId: string,
    sender: Participant,
    input: SendMessageRequest,
  ): Message | null {
    const messages = this.messages.get(roomId);
    if (!messages) return null;

    const existing = messages.find(
      (message) =>
        message.sender.id === sender.id &&
        message.clientMessageId === input.clientMessageId,
    );
    if (existing) return existing;

    const message: Message = {
      id: randomUUID(),
      clientMessageId: input.clientMessageId,
      roomId,
      sender,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    messages.push(message);
    return message;
  }
}
