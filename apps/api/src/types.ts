import type { Participant } from "@pulse/protocol";

import type { ChatStore } from "./store.js";

export interface BuildAppOptions {
  allowedOrigins?: string[];
  logger?: boolean;
  store?: ChatStore;
  tokenSecret: string;
}

export interface DemoIdentity {
  user: Participant;
  rooms: string[];
  expiresAt: string;
}
