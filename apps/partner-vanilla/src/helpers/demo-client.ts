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

function createTokenProvider(baseUrl: string, displayName: string) {
  let cachedToken: DemoToken | null = null;

  return async (): Promise<string> => {
    if (
      cachedToken &&
      Date.parse(cachedToken.expiresAt) - Date.now() > 30_000
    ) {
      return cachedToken.accessToken;
    }

    const response = await fetch(new URL("auth/demo-token", baseUrl), {
      body: JSON.stringify({ displayName }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const data: unknown = await response.json();
    if (!response.ok || !isDemoToken(data)) {
      throw new Error("Could not create a Northstar support session");
    }

    cachedToken = data;
    return data.accessToken;
  };
}

export function createPartnerClient(baseUrl: string): PulseClient {
  return createPulseClient({
    baseUrl,
    getToken: createTokenProvider(baseUrl, "Northstar visitor"),
  });
}
