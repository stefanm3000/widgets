import { z } from "zod";

import { MAX_MESSAGE_LENGTH } from "../constants.js";

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
