import type { Message, Participant, Room } from "@pulse/protocol";

export const demoRoom: Room = {
  id: "demo-room",
  name: "Live chat demo",
  description: "A shared room for testing the Pulse SDK and widget.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const systemParticipant: Participant = {
  id: "7bb92b54-0593-471e-819a-f85ab7089279",
  displayName: "Pulse Demo",
  source: "system",
};

export const seededMessages: Message[] = [
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
