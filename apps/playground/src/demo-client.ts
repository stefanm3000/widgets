import { createPulseClient, type PulseClient } from "@pulse/sdk";

interface DemoToken {
  accessToken: string;
  expiresAt: string;
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

function createDemoTokenProvider(baseUrl: string, displayName: string) {
  let cachedToken: DemoToken | null = null;
  let pendingToken: Promise<DemoToken> | null = null;

  const requestToken = async (): Promise<DemoToken> => {
    const response = await fetch(new URL("auth/demo-token", baseUrl), {
      body: JSON.stringify({ displayName }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const data: unknown = await response.json();

    if (!response.ok || !isDemoToken(data)) {
      throw new Error("Could not create a demo chat session");
    }

    return data;
  };

  return async () => {
    const refreshAt = cachedToken
      ? Date.parse(cachedToken.expiresAt) - 30_000
      : 0;
    if (cachedToken && Date.now() < refreshAt) return cachedToken.accessToken;

    pendingToken ??= requestToken();
    try {
      cachedToken = await pendingToken;
      return cachedToken.accessToken;
    } finally {
      pendingToken = null;
    }
  };
}

export function createDemoClient(
  baseUrl: string,
  displayName: string,
): PulseClient {
  return createPulseClient({
    baseUrl,
    getToken: createDemoTokenProvider(baseUrl, displayName),
  });
}
