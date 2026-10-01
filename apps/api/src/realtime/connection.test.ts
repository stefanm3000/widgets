import { EventEmitter } from "node:events";

import type { RealtimeEvent, ServerFrame } from "@pulse/protocol";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";

import { MemoryChatStore } from "../store.js";
import { sendFrame } from "./helpers.js";
import { handleConnection } from "./connection.js";

class TestSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  bufferedAmount = 0;
  frames: ServerFrame[] = [];
  closeCode: number | undefined;
  send(data: string) {
    this.frames.push(JSON.parse(data));
  }
  ping() {}
  close(code: number) {
    this.closeCode = code;
    this.terminate();
  }
  terminate() {
    this.readyState = WebSocket.CLOSED;
    this.emit("close");
  }
  frame(input: unknown) {
    this.emit("message", Buffer.from(JSON.stringify(input)), false);
  }
}

const identity = {
  user: {
    id: "7bb92b54-0593-471e-819a-f85ab7089279",
    displayName: "Tester",
    source: "vue" as const,
  },
  rooms: ["demo-room"],
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("realtime connection lifecycle", () => {
  it("expires active subscriptions and releases their listeners", async () => {
    vi.useFakeTimers();
    const store = new MemoryChatStore();
    const socket = new TestSocket();
    handleConnection(
      socket as unknown as WebSocket,
      { ...identity, expiresAt: new Date(Date.now() + 1_000).toISOString() },
      store,
    );
    socket.frame({ version: "1", type: "subscribe", roomId: "demo-room" });
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.frames.at(-1)?.type).toBe("subscribed");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(socket.closeCode).toBe(4001);
    expect(socket.frames.at(-1)).toMatchObject({
      type: "error",
      code: "token_expired",
      fatal: false,
    });
    const frameCount = socket.frames.length;
    await store.addMessage("demo-room", identity.user, {
      clientMessageId: crypto.randomUUID(),
      body: "After expiry",
    });
    expect(socket.frames).toHaveLength(frameCount);
  });

  it("delivers replay before live messages, without repeating buffered events", async () => {
    const store = new MemoryChatStore();
    const missed = await store.addMessage("demo-room", identity.user, {
      clientMessageId: crypto.randomUUID(),
      body: "Missed",
    });
    if (!missed) throw new Error("Missing message");
    const replay = store.getEventsAfter.bind(store);
    vi.spyOn(store, "getEventsAfter").mockImplementationOnce(
      async (roomId, cursor) => {
        await store.addMessage(roomId, identity.user, {
          clientMessageId: crypto.randomUUID(),
          body: "During replay",
        });
        return replay(roomId, cursor);
      },
    );
    const socket = new TestSocket();
    handleConnection(socket as unknown as WebSocket, identity, store);
    socket.frame({
      version: "1",
      type: "subscribe",
      roomId: "demo-room",
      cursor: "2",
    });
    await vi.waitFor(() =>
      expect(socket.frames.at(-1)?.type).toBe("subscribed"),
    );
    const events = socket.frames.filter(
      (frame): frame is Extract<ServerFrame, { type: "event" }> =>
        frame.type === "event",
    );
    expect(events.map((frame) => frame.event.payload.body)).toEqual([
      "Missed",
      "During replay",
    ]);
    socket.terminate();
  });

  it("bounds queued frames while a store operation is blocked", async () => {
    const store = new MemoryChatStore();
    let finish: ((value: undefined) => void) | undefined;
    vi.spyOn(store, "getRoom").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const socket = new TestSocket();
    handleConnection(socket as unknown as WebSocket, identity, store);
    const frame = { version: "1", type: "subscribe", roomId: "demo-room" };
    socket.frame(frame);
    await Promise.resolve();
    for (let index = 0; index < 32; index += 1) socket.frame(frame);
    expect(socket.frames.at(-1)).toMatchObject({
      type: "error",
      code: "rate_limited",
    });
    expect(socket.closeCode).toBe(1008);
    finish?.(undefined);
  });

  it("limits subscriptions without dropping existing rooms", async () => {
    const store = new MemoryChatStore();
    const socket = new TestSocket();
    handleConnection(socket as unknown as WebSocket, identity, store);
    for (let index = 0; index < 21; index += 1) {
      const channel = await store.createChannel(
        "demo-room",
        `Channel ${index}`,
      );
      socket.frame({ version: "1", type: "subscribe", roomId: channel.id });
      await vi.waitFor(() =>
        expect(socket.frames.at(-1)).toMatchObject(
          index === 20
            ? { type: "error", code: "subscription_limit" }
            : { type: "subscribed", roomId: channel.id },
        ),
      );
    }
    expect(socket.readyState).toBe(WebSocket.OPEN);
    socket.terminate();
  });

  it("terminates slow clients rather than adding to their outgoing backlog", () => {
    const socket = new TestSocket();
    socket.bufferedAmount = 1024 * 1024 + 1;
    sendFrame(socket as unknown as WebSocket, {
      version: "1",
      type: "ping",
      timestamp: 0,
    });
    expect(socket.readyState).toBe(WebSocket.CLOSED);
    expect(socket.frames).toHaveLength(0);
  });

  it("requests a history refetch when replay exceeds its limit", async () => {
    const store = new MemoryChatStore();
    for (let index = 0; index < 501; index += 1) {
      await store.addMessage("demo-room", identity.user, {
        clientMessageId: crypto.randomUUID(),
        body: `Message ${index}`,
      });
    }
    expect(await store.getEventsAfter("demo-room", "2")).toEqual({
      events: [] as RealtimeEvent[],
      expired: true,
      reason: "replay_limit",
    });
    const socket = new TestSocket();
    handleConnection(socket as unknown as WebSocket, identity, store);
    socket.frame({
      version: "1",
      type: "subscribe",
      roomId: "demo-room",
      cursor: "2",
    });
    await vi.waitFor(() =>
      expect(socket.frames.at(-1)?.type).toBe("subscribed"),
    );
    expect(
      socket.frames.some(
        (frame) =>
          frame.type === "refetch_required" && frame.reason === "replay_limit",
      ),
    ).toBe(true);
    expect(socket.frames.some((frame) => frame.type === "event")).toBe(false);
    socket.terminate();
  });
});
