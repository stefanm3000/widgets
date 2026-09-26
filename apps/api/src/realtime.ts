import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import {
  clientFrameSchema,
  PROTOCOL_VERSION,
  serverFrameSchema,
  type ServerFrame,
} from "@pulse/protocol";
import type { FastifyInstance } from "fastify";
import { WebSocket, WebSocketServer } from "ws";

import type { MemoryChatStore } from "./store.js";
import type { DemoIdentity, TokenService } from "./token.js";

const versionProtocol = "pulse.v1";
const tokenProtocolPrefix = "pulse-auth.";

interface RealtimeOptions {
  allowedOrigins: string[];
  store: MemoryChatStore;
  tokenService: TokenService;
}

function rejectUpgrade(socket: Duplex, statusCode: number, message: string) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

function parseProtocols(request: IncomingMessage): { token: string } | null {
  const protocols = (request.headers["sec-websocket-protocol"] ?? "")
    .split(",")
    .map((value) => value.trim());
  const tokenProtocol = protocols.find((protocol) =>
    protocol.startsWith(tokenProtocolPrefix),
  );
  if (!protocols.includes(versionProtocol) || !tokenProtocol) return null;
  return { token: tokenProtocol.slice(tokenProtocolPrefix.length) };
}

function send(socket: WebSocket, frame: ServerFrame) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(serverFrameSchema.parse(frame)));
  }
}

function sendError(
  socket: WebSocket,
  code: Extract<ServerFrame, { type: "error" }>["code"],
  message: string,
  fatal: boolean,
) {
  send(socket, {
    version: PROTOCOL_VERSION,
    type: "error",
    code,
    message,
    fatal,
  });
  if (fatal) socket.close(1008, message.slice(0, 123));
}

function handleConnection(
  socket: WebSocket,
  identity: DemoIdentity,
  store: MemoryChatStore,
) {
  const subscriptions = new Map<string, () => void>();
  let alive = true;

  send(socket, {
    version: PROTOCOL_VERSION,
    type: "ready",
    connectionId: randomUUID(),
  });

  socket.on("pong", () => {
    alive = true;
  });

  socket.on("message", (data, isBinary) => {
    if (isBinary) {
      sendError(
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
      sendError(socket, "malformed_frame", "Frame must be valid JSON", false);
      return;
    }

    const parsed = clientFrameSchema.safeParse(input);
    if (!parsed.success) {
      const version =
        typeof input === "object" && input !== null && "version" in input
          ? input.version
          : undefined;
      const unsupported = version !== PROTOCOL_VERSION;
      sendError(
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
      sendError(
        socket,
        "forbidden",
        "The token does not grant access to this room",
        true,
      );
      return;
    }
    if (!store.getRoom(frame.roomId)) {
      sendError(socket, "room_not_found", "Room not found", false);
      return;
    }

    subscriptions.get(frame.roomId)?.();
    const stop = store.subscribe(frame.roomId, (event) => {
      send(socket, { version: PROTOCOL_VERSION, type: "event", event });
    });
    subscriptions.set(frame.roomId, stop);

    send(socket, {
      version: PROTOCOL_VERSION,
      type: "subscribed",
      roomId: frame.roomId,
      cursor: store.getCurrentCursor(frame.roomId),
    });

    if (frame.cursor) {
      const replay = store.getEventsAfter(frame.roomId, frame.cursor);
      if (replay.expired) {
        send(socket, {
          version: PROTOCOL_VERSION,
          type: "refetch_required",
          roomId: frame.roomId,
          reason: "cursor_expired",
        });
        return;
      }
      for (const event of replay.events) {
        send(socket, { version: PROTOCOL_VERSION, type: "event", event });
      }
    }
  });

  const heartbeat = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
    send(socket, {
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

export function registerRealtime(
  app: FastifyInstance,
  options: RealtimeOptions,
) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 16 * 1024,
    handleProtocols(protocols) {
      return protocols.has(versionProtocol) ? versionProtocol : false;
    },
  });

  const onUpgrade = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname !== "/realtime") {
        rejectUpgrade(socket, 404, "Not Found");
        return;
      }

      const origin = request.headers.origin;
      if (origin && !options.allowedOrigins.includes(origin)) {
        rejectUpgrade(socket, 403, "Forbidden");
        return;
      }

      const auth = parseProtocols(request);
      const identity = auth
        ? await options.tokenService.verify(auth.token)
        : null;
      if (!identity) {
        rejectUpgrade(socket, 401, "Unauthorized");
        return;
      }

      wss.handleUpgrade(request, socket, head, (webSocket) => {
        handleConnection(webSocket, identity, options.store);
      });
    })().catch(() => rejectUpgrade(socket, 500, "Internal Server Error"));
  };

  app.server.on("upgrade", onUpgrade);
  app.addHook("onClose", async () => {
    app.server.off("upgrade", onUpgrade);
    for (const client of wss.clients) client.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });
}
