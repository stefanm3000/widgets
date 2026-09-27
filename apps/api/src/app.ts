import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import { registerRealtime } from "./realtime.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerRoomRoutes } from "./routes/rooms.js";
import { MemoryChatStore, type ChatStore } from "./store.js";
import { TokenService } from "./token.js";
import type { BuildAppOptions } from "./types.js";

export type { BuildAppOptions } from "./types.js";

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 16 * 1024,
  });
  const store: ChatStore = options.store ?? new MemoryChatStore();
  const tokenService = new TokenService(options.tokenSecret);

  await app.register(cors, {
    origin: options.allowedOrigins ?? false,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ status: "ok" }));
  registerAuthRoutes(app, tokenService);
  registerRoomRoutes(app, store, tokenService);
  registerRealtime(app, {
    allowedOrigins: options.allowedOrigins ?? [],
    store,
    tokenService,
  });
  app.addHook("onClose", async () => store.close?.());

  return app;
}
