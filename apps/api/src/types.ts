import type { Participant } from "@pulse/protocol";

import type { MemoryChatStore } from "./store.js";

export interface BuildAppOptions {
  allowedOrigins?: string[];
  logger?: boolean;
  store?: MemoryChatStore;
  tokenSecret: string;
}

export interface DemoIdentity {
  user: Participant;
  rooms: string[];
  expiresAt: string;
}
