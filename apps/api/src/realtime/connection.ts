import { randomUUID } from "node:crypto";

import {
  clientFrameSchema,
  PROTOCOL_VERSION,
  type RealtimeEvent,
} from "@pulse/protocol";
import { WebSocket, type RawData } from "ws";

import { canAccessRoom } from "../helpers/http.js";
import type { ChatStore } from "../store.js";
import type { DemoIdentity } from "../types.js";
import { MAX_REPLAY_EVENTS } from "../store/chat-store.js";
import { sendFrame, sendRealtimeError } from "./helpers.js";

export function handleConnection(
  socket: WebSocket,
  identity: DemoIdentity,
  store: ChatStore,
): void {
  const subscriptions = new Map<string, () => void>();
  let alive = true;
  const expire = () => {
    sendRealtimeError(socket, "token_expired", "The token has expired", false);
    socket.close(4001, "Token expired");
  };
  const expiresIn = Date.parse(identity.expiresAt) - Date.now();
  if (expiresIn <= 0) {
    expire();
    return;
  }
  const expiry = setTimeout(expire, expiresIn);
  expiry.unref();

  sendFrame(socket, {
    version: PROTOCOL_VERSION,
    type: "ready",
    connectionId: randomUUID(),
  });

  socket.on("pong", () => {
    alive = true;
  });

  const handleMessage = async (data: RawData, isBinary: boolean) => {
    if (Date.now() >= Date.parse(identity.expiresAt)) {
      expire();
      return;
    }
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

    if (!(await canAccessRoom(identity, frame.roomId, store))) {
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

    if (socket.readyState !== WebSocket.OPEN) return;
    if (!subscriptions.has(frame.roomId) && subscriptions.size >= 20) {
      sendRealtimeError(
        socket,
        "subscription_limit",
        "At most 20 room subscriptions are allowed",
        false,
      );
      return;
    }
    subscriptions.get(frame.roomId)?.();
    let replaying = true;
    const buffered: RealtimeEvent[] = [];
    const stop = store.subscribe(frame.roomId, (event) => {
      if (replaying) {
        if (buffered.length >= MAX_REPLAY_EVENTS) {
          socket.close(1013, "Subscription buffer exceeded");
        } else buffered.push(event);
        return;
      }
      sendFrame(socket, { version: PROTOCOL_VERSION, type: "event", event });
    });
    subscriptions.set(frame.roomId, stop);
    const cursor = await store.getCurrentCursor(frame.roomId);
    const delivered = new Set<string>();

    if (frame.cursor) {
      const replay = await store.getEventsAfter(frame.roomId, frame.cursor);
      if (replay.expired) {
        sendFrame(socket, {
          version: PROTOCOL_VERSION,
          type: "refetch_required",
          roomId: frame.roomId,
          reason: replay.reason ?? "cursor_expired",
        });
      } else
        for (const event of replay.events) {
          delivered.add(event.eventId);
          sendFrame(socket, {
            version: PROTOCOL_VERSION,
            type: "event",
            event,
          });
        }
    }
    buffered.sort((left, right) =>
      BigInt(left.eventId) < BigInt(right.eventId) ? -1 : 1,
    );
    for (const event of buffered) {
      if (!delivered.has(event.eventId)) {
        sendFrame(socket, { version: PROTOCOL_VERSION, type: "event", event });
      }
    }
    replaying = false;
    sendFrame(socket, {
      version: PROTOCOL_VERSION,
      type: "subscribed",
      roomId: frame.roomId,
      cursor,
    });
  };

  let pending = Promise.resolve();
  let pendingCount = 0;
  let windowStart = Date.now();
  let frameCount = 0;
  socket.on("message", (data, isBinary) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (Date.now() - windowStart >= 60_000) {
      windowStart = Date.now();
      frameCount = 0;
    }
    frameCount += 1;
    if (frameCount > 120 || pendingCount >= 32) {
      sendRealtimeError(
        socket,
        "rate_limited",
        "Too many realtime frames",
        true,
      );
      return;
    }
    pendingCount += 1;
    pending = pending
      .then(() => {
        if (socket.readyState === WebSocket.OPEN)
          return handleMessage(data, isBinary);
      })
      .catch(() => {
        socket.close(1011, "Unable to process frame");
      })
      .finally(() => {
        pendingCount -= 1;
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
    clearTimeout(expiry);
    clearInterval(heartbeat);
    for (const stop of subscriptions.values()) stop();
    subscriptions.clear();
  });
}
