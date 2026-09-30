import { apiErrorSchema, type ApiError } from "@pulse/protocol";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { ChatStore } from "../store.js";
import type { TokenService } from "../token.js";
import type { DemoIdentity } from "../types.js";

type ApiErrorCode = ApiError["error"]["code"];

export function sendApiError(
  reply: FastifyReply,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
) {
  return reply.code(statusCode).send(
    apiErrorSchema.parse({
      error: { code, message, requestId: reply.request.id },
    }),
  );
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  tokenService: TokenService,
): Promise<DemoIdentity | undefined> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    sendApiError(reply, 401, "unauthorized", "A bearer token is required");
    return undefined;
  }

  const identity = await tokenService.verify(
    authorization.slice("Bearer ".length),
  );
  if (!identity) {
    sendApiError(
      reply,
      401,
      "unauthorized",
      "The bearer token is invalid or expired",
    );
    return undefined;
  }
  return identity;
}

export async function canAccessRoom(
  identity: DemoIdentity,
  roomId: string,
  store: ChatStore,
): Promise<boolean> {
  if (identity.rooms.includes(roomId)) return true;
  const parentRoomId = await store.getParentRoomId(roomId);
  return parentRoomId !== undefined && identity.rooms.includes(parentRoomId);
}

export async function authorizeRoom(
  identity: DemoIdentity,
  roomId: string,
  reply: FastifyReply,
  store: ChatStore,
): Promise<boolean> {
  if (await canAccessRoom(identity, roomId, store)) return true;
  sendApiError(
    reply,
    403,
    "forbidden",
    "The token does not grant access to this room",
  );
  return false;
}
