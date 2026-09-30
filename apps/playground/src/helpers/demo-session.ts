import type { PulseClient } from "@pulse/sdk";

import { createDemoClient } from "./demo-client";

const sessionIdStorageKey = "pulse-playground-session-id";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DemoSession {
  client: PulseClient;
}

export function getApiUrl(): string {
  return new URL(
    import.meta.env.VITE_PULSE_API_URL ?? "/api/",
    globalThis.location.href,
  ).toString();
}

function getSessionId(): string {
  const savedId = globalThis.localStorage?.getItem(sessionIdStorageKey);
  if (savedId && uuidPattern.test(savedId)) return savedId;

  const sessionId = globalThis.crypto.randomUUID();
  globalThis.localStorage?.setItem(sessionIdStorageKey, sessionId);
  return sessionId;
}

export function createDemoSession(baseUrl: string): DemoSession {
  const sessionId = getSessionId();

  return {
    client: createDemoClient(baseUrl, sessionId),
  };
}
