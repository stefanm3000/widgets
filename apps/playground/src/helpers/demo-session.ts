import type { PulseClient } from "@pulse/sdk";

import { createDemoClient } from "./demo-client";

const displayNameStorageKey = "pulse-demo-name";

export interface DemoSession {
  client: PulseClient;
  displayName: string;
  id: string;
}

export function getApiUrl(): string {
  return new URL(
    import.meta.env.VITE_PULSE_API_URL ?? "/api/",
    globalThis.location.href,
  ).toString();
}

export function getDefaultDisplayName(): string {
  const savedName = globalThis.localStorage
    ?.getItem(displayNameStorageKey)
    ?.trim();
  if (savedName) return savedName;
  return `Guest ${Math.floor(100 + Math.random() * 900)}`;
}

export function createDemoSession(
  baseUrl: string,
  displayName: string,
): DemoSession {
  return {
    client: createDemoClient(baseUrl, displayName),
    displayName,
    id: globalThis.crypto.randomUUID(),
  };
}

export function saveDisplayName(displayName: string): void {
  globalThis.localStorage?.setItem(displayNameStorageKey, displayName);
}
