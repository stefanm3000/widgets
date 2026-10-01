import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import type { FastifyInstance } from "fastify";
import { WebSocketServer } from "ws";

import { handleConnection } from "./realtime/connection.js";
import {
  parseProtocols,
  rejectUpgrade,
  versionProtocol,
} from "./realtime/helpers.js";
import type { RealtimeOptions } from "./realtime/types.js";

export function registerRealtime(
  app: FastifyInstance,
  options: RealtimeOptions,
): void {
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
  app.addHook("preClose", async () => {
    app.server.off("upgrade", onUpgrade);
    for (const client of wss.clients) client.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });
}
