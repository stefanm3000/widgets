import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  apiErrorSchema,
  demoTokenRequestSchema,
  demoTokenResponseSchema,
  historyQuerySchema,
  messagePageSchema,
  roomIdSchema,
  roomSchema,
  sendMessageRequestSchema,
  sendMessageResponseSchema,
} from "@pulse/protocol";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";

import { MemoryChatStore } from "./store.js";
import { type DemoIdentity, TokenService } from "./token.js";
import { registerRealtime } from "./realtime.js";

const roomParamsSchema = z.object({ id: roomIdSchema });

export interface BuildAppOptions {
  allowedOrigins?: string[];
  logger?: boolean;
  store?: MemoryChatStore;
  tokenSecret: string;
}

function apiError(
  reply: FastifyReply,
  statusCode: number,
  code:
    | "invalid_request"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "internal_error",
  message: string,
) {
  return reply.code(statusCode).send(
    apiErrorSchema.parse({
      error: { code, message, requestId: reply.request.id },
    }),
  );
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  tokenService: TokenService,
): Promise<DemoIdentity | undefined> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    apiError(reply, 401, "unauthorized", "A bearer token is required");
    return undefined;
  }

  const identity = await tokenService.verify(
    authorization.slice("Bearer ".length),
  );
  if (!identity) {
    apiError(
      reply,
      401,
      "unauthorized",
      "The bearer token is invalid or expired",
    );
    return undefined;
  }
  return identity;
}

function authorizeRoom(
  identity: DemoIdentity,
  roomId: string,
  reply: FastifyReply,
): boolean {
  if (identity.rooms.includes(roomId)) return true;
  apiError(
    reply,
    403,
    "forbidden",
    "The token does not grant access to this room",
  );
  return false;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 16 * 1024,
  });
  const store = options.store ?? new MemoryChatStore();
  const tokenService = new TokenService(options.tokenSecret);

  await app.register(cors, {
    origin: options.allowedOrigins ?? false,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.post(
    "/auth/demo-token",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = demoTokenRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "A valid display name is required",
        );
      }

      const { identity, token } = await tokenService.issue(
        parsed.data.displayName,
        ["demo-room"],
      );
      return reply.send(
        demoTokenResponseSchema.parse({
          accessToken: token,
          expiresAt: identity.expiresAt,
          user: identity.user,
          rooms: identity.rooms,
        }),
      );
    },
  );

  app.get("/rooms/:id", async (request, reply) => {
    const identity = await authenticate(request, reply, tokenService);
    if (!identity) return;

    const params = roomParamsSchema.safeParse(request.params);
    if (!params.success)
      return apiError(reply, 400, "invalid_request", "Invalid room ID");
    if (!authorizeRoom(identity, params.data.id, reply)) return;

    const room = store.getRoom(params.data.id);
    if (!room) return apiError(reply, 404, "not_found", "Room not found");
    return reply.send(roomSchema.parse(room));
  });

  app.get("/rooms/:id/messages", async (request, reply) => {
    const identity = await authenticate(request, reply, tokenService);
    if (!identity) return;

    const params = roomParamsSchema.safeParse(request.params);
    const query = historyQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return apiError(reply, 400, "invalid_request", "Invalid history request");
    }
    if (!authorizeRoom(identity, params.data.id, reply)) return;

    const page = store.getMessages(params.data.id, query.data);
    if (!page)
      return apiError(reply, 400, "invalid_request", "Invalid room or cursor");
    return reply.send(messagePageSchema.parse(page));
  });

  app.post("/rooms/:id/messages", async (request, reply) => {
    const identity = await authenticate(request, reply, tokenService);
    if (!identity) return;

    const params = roomParamsSchema.safeParse(request.params);
    const body = sendMessageRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return apiError(reply, 400, "invalid_request", "Invalid message request");
    }
    if (!authorizeRoom(identity, params.data.id, reply)) return;

    const result = store.addMessage(params.data.id, identity.user, body.data);
    if (!result) return apiError(reply, 404, "not_found", "Room not found");
    return reply
      .code(result.created ? 201 : 200)
      .send(sendMessageResponseSchema.parse({ message: result.message }));
  });

  registerRealtime(app, {
    allowedOrigins: options.allowedOrigins ?? [],
    store,
    tokenService,
  });

  return app;
}
