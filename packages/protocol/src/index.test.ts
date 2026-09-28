import { describe, expect, it } from "vitest";

import {
  clientFrameSchema,
  MAX_MESSAGE_LENGTH,
  messageSchema,
  sendMessageRequestSchema,
} from "./index.js";

describe("chat protocol", () => {
  it("accepts a valid message", () => {
    expect(
      messageSchema.parse({
        id: "c4961597-1c48-47fa-9955-380cfe48b184",
        clientMessageId: "501e5b61-444a-46b2-a024-831730c0c028",
        roomId: "demo-room",
        sender: {
          id: "ec63d780-d6cf-4eb4-9101-813037a30908",
          displayName: "Sam",
          source: "playground",
        },
        body: "Hello from the demo",
        createdAt: "2026-09-26T18:00:00.000Z",
      }),
    ).toMatchObject({ roomId: "demo-room", body: "Hello from the demo" });
  });

  it("requires a supported message source", () => {
    expect(
      messageSchema.safeParse({
        id: "c4961597-1c48-47fa-9955-380cfe48b184",
        clientMessageId: "501e5b61-444a-46b2-a024-831730c0c028",
        roomId: "demo-room",
        sender: {
          id: "ec63d780-d6cf-4eb4-9101-813037a30908",
          displayName: "Sam",
          source: "unknown",
        },
        body: "Hello from somewhere",
        createdAt: "2026-09-26T18:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("trims outgoing messages and enforces the length limit", () => {
    expect(
      sendMessageRequestSchema.parse({
        clientMessageId: "501e5b61-444a-46b2-a024-831730c0c028",
        body: "  Hello  ",
      }).body,
    ).toBe("Hello");

    expect(() =>
      sendMessageRequestSchema.parse({
        clientMessageId: "501e5b61-444a-46b2-a024-831730c0c028",
        body: "x".repeat(MAX_MESSAGE_LENGTH + 1),
      }),
    ).toThrow();
  });

  it("rejects unknown realtime frame versions", () => {
    expect(
      clientFrameSchema.safeParse({
        version: "2",
        type: "subscribe",
        roomId: "demo-room",
      }).success,
    ).toBe(false);
  });
});
