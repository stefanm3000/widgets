export type {
  Message,
  MessagePage,
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
  PulseCredentials,
  PulseToken,
  PulseTokenProvider,
  PulseWebSocket,
  ReconnectOptions,
} from "./types.js";
