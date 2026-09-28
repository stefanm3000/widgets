import type { z } from "zod";

import type {
  apiErrorSchema,
  demoTokenRequestSchema,
  demoTokenResponseSchema,
  historyQuerySchema,
  messagePageSchema,
  sendMessageRequestSchema,
  sendMessageResponseSchema,
} from "./schemas/http.js";
import type {
  clientFrameSchema,
  realtimeEventSchema,
  serverFrameSchema,
} from "./schemas/realtime.js";
import type {
  demoClientSourceSchema,
  messageSchema,
  messageSourceSchema,
  participantSchema,
  roomSchema,
} from "./schemas/shared.js";

export type DemoClientSource = z.infer<typeof demoClientSourceSchema>;
export type MessageSource = z.infer<typeof messageSourceSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Message = z.infer<typeof messageSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type MessagePage = z.infer<typeof messagePageSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
export type DemoTokenRequest = z.infer<typeof demoTokenRequestSchema>;
export type DemoTokenResponse = z.infer<typeof demoTokenResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ClientFrame = z.infer<typeof clientFrameSchema>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
export type ServerFrame = z.infer<typeof serverFrameSchema>;
