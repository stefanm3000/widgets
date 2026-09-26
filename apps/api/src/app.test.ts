import { randomUUID } from "node:crypto";

import {
  apiErrorSchema,
  demoTokenResponseSchema,
  messagePageSchema,
  roomSchema,
  sendMessageResponseSchema,
} from "@pulse/protocol";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const tokenSecret = "test-token-secret-with-at-least-32-characters";

describe("HTTP chat API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ tokenSecret });
  });

  afterEach(async () => {
    await app.close();
  });

  async function issueToken(displayName = "Taylor") {
    const response = await app.inject({
      method: "POST",
      url: "/auth/demo-token",
      payload: { displayName },
    });
    expect(response.statusCode).toBe(200);
    return demoTokenResponseSchema.parse(response.json()).accessToken;
  }

  it("reports health without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("requires a valid token for room data", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/rooms/demo-room",
    });
    expect(response.statusCode).toBe(401);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe(
      "unauthorized",
    );
  });

  it("returns the seeded room and recent history", async () => {
    const token = await issueToken();
    const headers = { authorization: `Bearer ${token}` };

    const roomResponse = await app.inject({
      method: "GET",
      url: "/rooms/demo-room",
      headers,
    });
    const historyResponse = await app.inject({
      method: "GET",
      url: "/rooms/demo-room/messages?limit=1",
      headers,
    });

    expect(roomSchema.parse(roomResponse.json()).name).toBe("Live chat demo");
    const page = messagePageSchema.parse(historyResponse.json());
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe("1");
  });

  it("creates a message idempotently for one user and client ID", async () => {
    const token = await issueToken();
    const clientMessageId = randomUUID();
    const request = {
      method: "POST" as const,
      url: "/rooms/demo-room/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { clientMessageId, body: "  Hello from the API  " },
    };

    const first = await app.inject(request);
    const second = await app.inject(request);
    const firstMessage = sendMessageResponseSchema.parse(first.json()).message;
    const secondMessage = sendMessageResponseSchema.parse(
      second.json(),
    ).message;

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(firstMessage.id).toBe(secondMessage.id);
    expect(firstMessage.body).toBe("Hello from the API");
  });

  it("rejects malformed message input", async () => {
    const token = await issueToken();
    const response = await app.inject({
      method: "POST",
      url: "/rooms/demo-room/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { clientMessageId: "not-a-uuid", body: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe(
      "invalid_request",
    );
  });
});
