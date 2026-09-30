import { z } from "zod";

import { MAX_MESSAGE_LENGTH } from "../constants.js";
import {
  demoClientSourceSchema,
  messageSchema,
  participantSchema,
  roomIdSchema,
  roomSchema,
} from "./shared.js";

export const createChannelRequestSchema = z.object({
  name: roomSchema.shape.name,
});

export const channelListSchema = z.object({ items: z.array(roomSchema) });

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

export const demoTokenRequestSchema = z.object({
  sessionId: z.uuid(),
  source: demoClientSourceSchema,
});

export const demoTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
  user: participantSchema,
  rooms: z.array(roomIdSchema),
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
