import { z } from "zod";

import { PROTOCOL_VERSION } from "../constants.js";
import { messageSchema, roomIdSchema } from "./shared.js";

const versionSchema = z.literal(PROTOCOL_VERSION);
const eventCursorSchema = z.string().regex(/^\d{1,19}$/);

export const clientFrameSchema = z.discriminatedUnion("type", [
  z.object({
    version: versionSchema,
    type: z.literal("subscribe"),
    roomId: roomIdSchema,
    cursor: eventCursorSchema.optional(),
  }),
  z.object({
    version: versionSchema,
    type: z.literal("unsubscribe"),
    roomId: roomIdSchema,
  }),
  z.object({
    version: versionSchema,
    type: z.literal("pong"),
    timestamp: z.number().int().nonnegative(),
  }),
]);

export const realtimeEventSchema = z.object({
  eventId: eventCursorSchema,
  roomId: roomIdSchema,
  type: z.literal("message.created"),
  payload: messageSchema,
});

export const serverFrameSchema = z.discriminatedUnion("type", [
  z.object({
    version: versionSchema,
    type: z.literal("ready"),
    connectionId: z.uuid(),
  }),
  z.object({
    version: versionSchema,
    type: z.literal("subscribed"),
    roomId: roomIdSchema,
    cursor: eventCursorSchema.nullable(),
  }),
  z.object({
    version: versionSchema,
    type: z.literal("event"),
    event: realtimeEventSchema,
  }),
  z.object({
    version: versionSchema,
    type: z.literal("refetch_required"),
    roomId: roomIdSchema,
    reason: z.enum(["cursor_expired", "replay_limit"]),
  }),
  z.object({
    version: versionSchema,
    type: z.literal("error"),
    code: z.enum([
      "malformed_frame",
      "unsupported_version",
      "unauthorized",
      "forbidden",
      "room_not_found",
      "token_expired",
      "rate_limited",
      "subscription_limit",
    ]),
    message: z.string(),
    fatal: z.boolean(),
  }),
  z.object({
    version: versionSchema,
    type: z.literal("ping"),
    timestamp: z.number().int().nonnegative(),
  }),
]);
