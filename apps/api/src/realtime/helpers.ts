import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import {
  PROTOCOL_VERSION,
  serverFrameSchema,
  type ServerFrame,
} from "@pulse/protocol";
import { WebSocket } from "ws";

export const versionProtocol = "pulse.v1";
const tokenProtocolPrefix = "pulse-auth.";

export function rejectUpgrade(
  socket: Duplex,
  statusCode: number,
  message: string,
): void {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

export function parseProtocols(
  request: IncomingMessage,
): { token: string } | null {
  const protocols = (request.headers["sec-websocket-protocol"] ?? "")
    .split(",")
    .map((value) => value.trim());
  const tokenProtocol = protocols.find((protocol) =>
    protocol.startsWith(tokenProtocolPrefix),
  );
  if (!protocols.includes(versionProtocol) || !tokenProtocol) return null;
  return { token: tokenProtocol.slice(tokenProtocolPrefix.length) };
}

export function sendFrame(socket: WebSocket, frame: ServerFrame): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(serverFrameSchema.parse(frame)));
  }
}

export function sendRealtimeError(
  socket: WebSocket,
  code: Extract<ServerFrame, { type: "error" }>["code"],
  message: string,
  fatal: boolean,
): void {
  sendFrame(socket, {
    version: PROTOCOL_VERSION,
    type: "error",
    code,
    message,
    fatal,
  });
  if (fatal) socket.close(1008, message.slice(0, 123));
}
