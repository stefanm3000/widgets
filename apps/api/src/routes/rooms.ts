import {
  historyQuerySchema,
  messagePageSchema,
  roomIdSchema,
  roomSchema,
  sendMessageRequestSchema,
  sendMessageResponseSchema,
} from "@pulse/protocol";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate, authorizeRoom, sendApiError } from "../helpers/http.js";
import type { MemoryChatStore } from "../store.js";
import type { TokenService } from "../token.js";

const roomParamsSchema = z.object({ id: roomIdSchema });

export function registerRoomRoutes(
  app: FastifyInstance,
  store: MemoryChatStore,
  tokenService: TokenService,
): void {
  app.get("/rooms/:id", async (request, reply) => {
    const identity = await authenticate(request, reply, tokenService);
    if (!identity) return;

    const params = roomParamsSchema.safeParse(request.params);
    if (!params.success) {
      return sendApiError(reply, 400, "invalid_request", "Invalid room ID");
    }
    if (!authorizeRoom(identity, params.data.id, reply)) return;

    const room = store.getRoom(params.data.id);
    if (!room) return sendApiError(reply, 404, "not_found", "Room not found");
    return reply.send(roomSchema.parse(room));
  });

  app.get("/rooms/:id/messages", async (request, reply) => {
    const identity = await authenticate(request, reply, tokenService);
    if (!identity) return;

    const params = roomParamsSchema.safeParse(request.params);
    const query = historyQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return sendApiError(
        reply,
        400,
        "invalid_request",
        "Invalid history request",
      );
    }
    if (!authorizeRoom(identity, params.data.id, reply)) return;

    const page = store.getMessages(params.data.id, query.data);
    if (!page) {
      return sendApiError(
        reply,
        400,
        "invalid_request",
        "Invalid room or cursor",
      );
    }
    return reply.send(messagePageSchema.parse(page));
  });

  app.post("/rooms/:id/messages", async (request, reply) => {
    const identity = await authenticate(request, reply, tokenService);
    if (!identity) return;

    const params = roomParamsSchema.safeParse(request.params);
    const body = sendMessageRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return sendApiError(
        reply,
        400,
        "invalid_request",
        "Invalid message request",
      );
    }
    if (!authorizeRoom(identity, params.data.id, reply)) return;

    const result = store.addMessage(params.data.id, identity.user, body.data);
    if (!result) {
      return sendApiError(reply, 404, "not_found", "Room not found");
    }
    return reply
      .code(result.created ? 201 : 200)
      .send(sendMessageResponseSchema.parse({ message: result.message }));
  });
}
