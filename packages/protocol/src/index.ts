import { z } from "zod";

export const PROTOCOL_VERSION = "1" as const;
export const MAX_MESSAGE_LENGTH = 500;

export const roomIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const participantSchema = z.object({
  id: z.uuid(),
  displayName: z.string().trim().min(1).max(80),
});

export const roomSchema = z.object({
  id: roomIdSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(280).nullable(),
  createdAt: z.iso.datetime(),
});

export const messageSchema = z.object({
  id: z.uuid(),
  clientMessageId: z.uuid(),
  roomId: roomIdSchema,
  sender: participantSchema,
  body: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  createdAt: z.iso.datetime(),
});

export const historyQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const messagePageSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});

export const sendMessageRequestSchema = z.object({
  clientMessageId: z.uuid(),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const sendMessageResponseSchema = z.object({
  message: messageSchema,
});

export const apiErrorCodeSchema = z.enum([
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "internal_error",
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

const versionSchema = z.literal(PROTOCOL_VERSION);

export const clientFrameSchema = z.discriminatedUnion("type", [
  z.object({
    version: versionSchema,
    type: z.literal("subscribe"),
    roomId: roomIdSchema,
    cursor: z.string().min(1).optional(),
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
  eventId: z.string().regex(/^\d+$/),
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
    cursor: z.string().nullable(),
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
    reason: z.literal("cursor_expired"),
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

export type Participant = z.infer<typeof participantSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Message = z.infer<typeof messageSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type MessagePage = z.infer<typeof messagePageSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ClientFrame = z.infer<typeof clientFrameSchema>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
export type ServerFrame = z.infer<typeof serverFrameSchema>;
