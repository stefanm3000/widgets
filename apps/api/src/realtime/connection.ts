import { randomUUID } from "node:crypto";

import { clientFrameSchema, PROTOCOL_VERSION } from "@pulse/protocol";
import { WebSocket, type RawData } from "ws";

import type { ChatStore } from "../store.js";
import type { DemoIdentity } from "../types.js";
import { sendFrame, sendRealtimeError } from "./helpers.js";

export function handleConnection(
  socket: WebSocket,
  identity: DemoIdentity,
  store: ChatStore,
): void {
  const subscriptions = new Map<string, () => void>();
  let alive = true;

  sendFrame(socket, {
    version: PROTOCOL_VERSION,
    type: "ready",
    connectionId: randomUUID(),
  });

  socket.on("pong", () => {
    alive = true;
  });

  const handleMessage = async (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      sendRealtimeError(
        socket,
        "malformed_frame",
        "Binary frames are not supported",
        false,
      );
      return;
    }

    let input: unknown;
    try {
      input = JSON.parse(data.toString());
    } catch {
      sendRealtimeError(
        socket,
        "malformed_frame",
        "Frame must be valid JSON",
        false,
      );
      return;
    }

    const parsed = clientFrameSchema.safeParse(input);
    if (!parsed.success) {
      const version =
        typeof input === "object" && input !== null && "version" in input
          ? input.version
          : undefined;
      const unsupported = version !== PROTOCOL_VERSION;
      sendRealtimeError(
        socket,
        unsupported ? "unsupported_version" : "malformed_frame",
        unsupported ? "Unsupported protocol version" : "Invalid frame",
        unsupported,
      );
      return;
    }

    const frame = parsed.data;
    if (frame.type === "pong") {
      alive = true;
      return;
    }

    if (frame.type === "unsubscribe") {
      subscriptions.get(frame.roomId)?.();
      subscriptions.delete(frame.roomId);
      return;
    }

    if (!identity.rooms.includes(frame.roomId)) {
      sendRealtimeError(
        socket,
        "forbidden",
        "The token does not grant access to this room",
        true,
      );
      return;
    }
    if (!(await store.getRoom(frame.roomId))) {
      sendRealtimeError(socket, "room_not_found", "Room not found", false);
      return;
    }

    subscriptions.get(frame.roomId)?.();
    const stop = store.subscribe(frame.roomId, (event) => {
      sendFrame(socket, { version: PROTOCOL_VERSION, type: "event", event });
    });
    subscriptions.set(frame.roomId, stop);

    sendFrame(socket, {
      version: PROTOCOL_VERSION,
      type: "subscribed",
      roomId: frame.roomId,
      cursor: await store.getCurrentCursor(frame.roomId),
    });

    if (frame.cursor) {
      const replay = await store.getEventsAfter(frame.roomId, frame.cursor);
      if (replay.expired) {
        sendFrame(socket, {
          version: PROTOCOL_VERSION,
          type: "refetch_required",
          roomId: frame.roomId,
          reason: "cursor_expired",
        });
        return;
      }
      for (const event of replay.events) {
        sendFrame(socket, {
          version: PROTOCOL_VERSION,
          type: "event",
          event,
        });
      }
    }
  };

  socket.on("message", (data, isBinary) => {
    void handleMessage(data, isBinary).catch(() => {
      socket.close(1011, "Unable to process frame");
    });
  });

  const heartbeat = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
    sendFrame(socket, {
      version: PROTOCOL_VERSION,
      type: "ping",
      timestamp: Date.now(),
    });
  }, 30_000);
  heartbeat.unref();

  socket.once("close", () => {
    clearInterval(heartbeat);
    for (const stop of subscriptions.values()) stop();
    subscriptions.clear();
  });
}
