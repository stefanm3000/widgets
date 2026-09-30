import { randomUUID } from "node:crypto";
import { once } from "node:events";

import {
  apiErrorSchema,
  demoTokenResponseSchema,
  messagePageSchema,
  roomSchema,
  sendMessageResponseSchema,
  serverFrameSchema,
  type ServerFrame,
} from "@pulse/protocol";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { TokenService } from "./token.js";
import { buildApp } from "./app.js";

const tokenSecret = "test-token-secret-with-at-least-32-characters";

function nextFrame(socket: WebSocket): Promise<ServerFrame> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out waiting for frame")),
      2_000,
    );
    socket.once("message", (data) => {
      clearTimeout(timeout);
      resolve(serverFrameSchema.parse(JSON.parse(data.toString())));
    });
  });
}

describe("HTTP chat API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ tokenSecret });
  });

  afterEach(async () => {
    await app.close();
  });

  async function issueToken(
    source: "playground" | "vue" | "vanilla" = "playground",
    sessionId = randomUUID(),
  ) {
    const response = await app.inject({
      method: "POST",
      url: "/auth/demo-token",
      payload: { sessionId, source },
    });
    expect(response.statusCode).toBe(200);
    return demoTokenResponseSchema.parse(response.json()).accessToken;
  }

  it("creates shared channels with isolated history and inherited room access", async () => {
    const token = await issueToken();
    const headers = { authorization: `Bearer ${token}` };
    const created = await app.inject({
      method: "POST",
      url: "/rooms/demo-room/channels",
      headers,
      payload: { name: "  Design  " },
    });
    expect(created.statusCode).toBe(201);
    const channel = roomSchema.parse(created.json());
    expect(channel.name).toBe("Design");
    const otherHeaders = { authorization: `Bearer ${await issueToken("vue")}` };
    const list = await app.inject({
      method: "GET",
      url: "/rooms/demo-room/channels",
      headers: otherHeaders,
    });
    expect(list.json().items).toEqual([channel]);
    const history = await app.inject({
      method: "GET",
      url: `/rooms/${channel.id}/messages`,
      headers: otherHeaders,
    });
    expect(history.json().items).toEqual([]);
    const sent = await app.inject({
      method: "POST",
      url: `/rooms/${channel.id}/messages`,
      headers,
      payload: { clientMessageId: randomUUID(), body: "Only in Design" },
    });
    expect(sent.statusCode).toBe(201);
    const original = await app.inject({
      method: "GET",
      url: "/rooms/demo-room/messages",
      headers,
    });
    expect(
      original
        .json()
        .items.some(
          (message: { body: string }) => message.body === "Only in Design",
        ),
    ).toBe(false);

    const restricted = await new TokenService(tokenSecret).issue(
      "vue",
      randomUUID(),
      ["unrelated-room"],
    );
    const deniedHeaders = { authorization: `Bearer ${restricted.token}` };
    for (const url of [
      `/rooms/${channel.id}`,
      `/rooms/${channel.id}/messages`,
      "/rooms/demo-room/channels",
    ]) {
      expect(
        (await app.inject({ method: "GET", url, headers: deniedHeaders }))
          .statusCode,
      ).toBe(403);
    }
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/rooms/demo-room/channels",
          headers: deniedHeaders,
          payload: { name: "Denied" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/rooms/${channel.id}/channels`,
          headers,
          payload: { name: "Nested" },
        })
      ).statusCode,
    ).toBe(400);
  });

  it("validates channel names and requires authentication", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/rooms/demo-room/channels" }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/rooms/demo-room/channels",
          payload: { name: "Design" },
        })
      ).statusCode,
    ).toBe(401);
    const headers = { authorization: `Bearer ${await issueToken()}` };
    for (const name of ["", "   ", "x".repeat(121)]) {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/rooms/demo-room/channels",
            headers,
            payload: { name },
          })
        ).statusCode,
      ).toBe(400);
    }
  });

  it("reports health without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("assigns a stable anonymous identity for a client session", async () => {
    const sessionId = randomUUID();
    const firstResponse = await app.inject({
      method: "POST",
      url: "/auth/demo-token",
      payload: { sessionId, source: "vue" },
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/auth/demo-token",
      payload: { sessionId, source: "vue" },
    });
    const first = demoTokenResponseSchema.parse(firstResponse.json());
    const second = demoTokenResponseSchema.parse(secondResponse.json());

    expect(first.user).toEqual(second.user);
    expect(first.user.source).toBe("vue");
    expect(first.user.displayName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
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
    expect(second.statusCode).toBe(200);
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

  it("broadcasts a committed message to a subscribed client", async () => {
    const receiverToken = await issueToken("vue");
    const senderToken = await issueToken("vanilla");
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP address");
    }

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/realtime`, [
      "pulse.v1",
      `pulse-auth.${receiverToken}`,
    ]);
    const ready = nextFrame(socket);
    await once(socket, "open");
    expect((await ready).type).toBe("ready");

    const subscribed = nextFrame(socket);
    socket.send(
      JSON.stringify({ version: "1", type: "subscribe", roomId: "demo-room" }),
    );
    expect((await subscribed).type).toBe("subscribed");

    const eventFrame = nextFrame(socket);
    const response = await app.inject({
      method: "POST",
      url: "/rooms/demo-room/messages",
      headers: { authorization: `Bearer ${senderToken}` },
      payload: { clientMessageId: randomUUID(), body: "Delivered live" },
    });
    const sentMessage = sendMessageResponseSchema.parse(
      response.json(),
    ).message;
    const received = await eventFrame;

    expect(received.type).toBe("event");
    if (received.type === "event") {
      expect(received.event.payload.id).toBe(sentMessage.id);
      expect(received.event.payload.body).toBe("Delivered live");
      expect(received.event.payload.sender.source).toBe("vanilla");
    }

    socket.close();
    await once(socket, "close");
  });
});
