export type {
  Message,
  MessageSource,
  Participant,
  RealtimeEvent,
  Room,
} from "@pulse/protocol";

export { PulseApiError } from "./errors/pulse-api-error.js";
export { createPulseClient, PulseClient } from "./pulse-client.js";
export type {
  ConnectionState,
  GetMessagesOptions,
  PulseClientOptions,
  PulseWebSocket,
  ReconnectOptions,
} from "./types.js";
