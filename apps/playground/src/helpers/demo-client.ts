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
    let response: Response;
    try {
      response = await fetch(new URL("auth/demo-token", baseUrl), {
        body: JSON.stringify({ displayName }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } catch {
      throw new Error("Could not connect to the chat service");
    }

    if (!response.ok) {
      throw new Error("Could not create a demo chat session");
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("The chat service returned an invalid response");
    }

    if (!isDemoToken(data)) {
      throw new Error("The chat service returned an invalid response");
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
