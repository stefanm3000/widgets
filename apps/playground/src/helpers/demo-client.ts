import { createPulseClient, type PulseClient } from "@pulse/sdk";

import { demoQueryClient } from "./query-client";

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

  return async (): Promise<string> => {
    const token = await demoQueryClient.query({
      queryFn: requestToken,
      queryKey: ["demo-token", baseUrl, displayName],
      staleTime: (query) => {
        const cachedToken = query.state.data;
        if (!isDemoToken(cachedToken)) return 0;
        return Math.max(
          0,
          Date.parse(cachedToken.expiresAt) -
            query.state.dataUpdatedAt -
            30_000,
        );
      },
    });

    return token.accessToken;
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
