import { createPulseClient, type PulseClient } from "@pulse/sdk";

interface DemoToken {
  accessToken: string;
  expiresAt: string;
}

const sessionIdStorageKey = "pulse-vanilla-session-id";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSessionId(): string {
  const savedId = globalThis.localStorage?.getItem(sessionIdStorageKey);
  if (savedId && uuidPattern.test(savedId)) return savedId;

  const sessionId = globalThis.crypto.randomUUID();
  globalThis.localStorage?.setItem(sessionIdStorageKey, sessionId);
  return sessionId;
}

function isDemoToken(value: unknown): value is DemoToken {
  if (!value || typeof value !== "object") return false;
  const token = value as Record<string, unknown>;
  return (
    typeof token.accessToken === "string" &&
    token.accessToken.length > 0 &&
    typeof token.expiresAt === "string" &&
    Number.isFinite(Date.parse(token.expiresAt))
  );
}

function createTokenProvider(baseUrl: string) {
  let cachedToken: DemoToken | null = null;
  const sessionId = getSessionId();

  return async (): Promise<string> => {
    if (
      cachedToken &&
      Date.parse(cachedToken.expiresAt) - Date.now() > 30_000
    ) {
      return cachedToken.accessToken;
    }

    const response = await fetch(new URL("auth/demo-token", baseUrl), {
      body: JSON.stringify({ sessionId, source: "vanilla" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const data: unknown = await response.json();
    if (!response.ok || !isDemoToken(data)) {
      throw new Error("Could not create a Vanilla session");
    }

    cachedToken = data;
    return data.accessToken;
  };
}

export function createPartnerClient(baseUrl: string): PulseClient {
  return createPulseClient({
    baseUrl,
    getToken: createTokenProvider(baseUrl),
  });
}
