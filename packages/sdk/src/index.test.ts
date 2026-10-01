import {
  PROTOCOL_VERSION,
  type Message,
  type ServerFrame,
} from "@pulse/protocol";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPulseClient,
  PulseApiError,
  type PulseWebSocket,
} from "./index.js";

const demoMessage: Message = {
  id: "017e106e-e16b-4af7-be34-bcdedd50d1a1",
  clientMessageId: "ea81cc51-bf45-4802-8ca8-9df196821694",
  roomId: "demo-room",
  sender: {
    id: "7bb92b54-0593-471e-819a-f85ab7089279",
    displayName: "Pulse Demo",
    source: "system",
  },
  body: "Delivered live",
  createdAt: "2026-01-01T00:00:01.000Z",
};

class FakeWebSocket implements PulseWebSocket {
  readyState = 0;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readonly sent: string[] = [];

  open() {
    this.readyState = 1;
    this.onopen?.({ type: "open" } as Event);
  }

  receive(frame: ServerFrame) {
    this.onmessage?.({ data: JSON.stringify(frame) } as MessageEvent<string>);
  }

  disconnect(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code } as CloseEvent);
  }

  close(code = 1000, reason = "") {
    this.readyState = 3;
    this.onclose?.({ code, reason } as CloseEvent);
  }

  send(data: string) {
    this.sent.push(data);
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PulseClient HTTP", () => {
  it("exposes the authenticated user from structured credentials", async () => {
    const getToken = vi.fn(async () => ({
      accessToken: "demo-token",
      user: demoMessage.sender,
    }));
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      fetch: async () => new Response("{}"),
      getToken,
    });

    await expect(client.getCurrentUser()).resolves.toEqual(demoMessage.sender);
    expect(getToken).toHaveBeenCalledOnce();
    client.dispose();
  });

  it("authenticates and validates room responses", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(
      async (_input, _init) =>
        new Response(
          JSON.stringify({
            id: "demo-room",
            name: "Live chat demo",
            description: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          }),
          { status: 200 },
        ),
    );
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      fetch: fetchMock,
      getToken: () => "demo-token",
    });

    await expect(client.getRoom("demo-room")).resolves.toMatchObject({
      id: "demo-room",
    });
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer demo-token",
    );
    client.dispose();
  });

  it("lists channels and validates creation before sending an authenticated request", async () => {
    const room = {
      id: "design",
      name: "Design",
      description: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [room] })))
      .mockResolvedValueOnce(new Response(JSON.stringify(room)));
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      fetch: fetchMock,
      getToken: () => "demo-token",
    });
    await expect(client.getChannels("demo-room")).resolves.toEqual([room]);
    await expect(
      client.createChannel("demo-room", " Design "),
    ).resolves.toEqual(room);
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "https://api.example.com/rooms/demo-room/channels",
    );
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ name: "Design" });
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer demo-token",
    );
    await expect(client.createChannel("demo-room", " ")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    client.dispose();
  });

  it("surfaces structured API errors", async () => {
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "forbidden",
              message: "Room access denied",
              requestId: "req-1",
            },
          }),
          { status: 403 },
        ),
      getToken: () => "demo-token",
    });

    const error = await client
      .getRoom("demo-room")
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PulseApiError);
    expect(error).toMatchObject({
      code: "forbidden",
      message: "Room access denied",
      status: 403,
    });
    client.dispose();
  });
});

describe("PulseClient realtime", () => {
  it("resumes idle and empty rooms and never moves a cursor backwards", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const sockets: FakeWebSocket[] = [];
    const listener = vi.fn();
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      getToken: () => "token",
      reconnect: { baseDelayMs: 10, maxDelayMs: 10 },
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.subscribe("demo-room", listener);
    client.subscribe("empty-room", listener);
    const ready = {
      version: PROTOCOL_VERSION,
      type: "ready" as const,
      connectionId: "dcb9cf80-5523-4593-bb7c-8f349e327b46",
    };
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]!.open();
    sockets[0]!.receive(ready);
    sockets[0]!.receive({
      version: PROTOCOL_VERSION,
      type: "subscribed",
      roomId: "demo-room",
      cursor: "12",
    });
    sockets[0]!.receive({
      version: PROTOCOL_VERSION,
      type: "subscribed",
      roomId: "empty-room",
      cursor: null,
    });
    sockets[0]!.disconnect();
    await vi.advanceTimersByTimeAsync(10);
    sockets[1]!.open();
    sockets[1]!.receive(ready);
    expect(sockets[1]!.sent.map((value) => JSON.parse(value))).toMatchObject([
      { roomId: "demo-room", cursor: "12" },
      { roomId: "empty-room", cursor: "0" },
    ]);
    for (const eventId of ["14", "13"])
      sockets[1]!.receive({
        version: PROTOCOL_VERSION,
        type: "event",
        event: {
          eventId,
          roomId: "demo-room",
          type: "message.created",
          payload: { ...demoMessage, id: crypto.randomUUID() },
        },
      });
    sockets[1]!.disconnect();
    await vi.advanceTimersByTimeAsync(10);
    sockets[2]!.open();
    sockets[2]!.receive(ready);
    expect(JSON.parse(sockets[2]!.sent[0]!)).toMatchObject({ cursor: "14" });
    expect(listener).toHaveBeenCalledTimes(2);
    client.dispose();
  });

  it("refreshes credentials after token expiry but stops after fatal authorization errors", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const getToken = vi
      .fn()
      .mockReturnValueOnce("old-token")
      .mockReturnValue("fresh-token");
    const sockets: FakeWebSocket[] = [];
    const protocols: string[][] = [];
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      getToken,
      reconnect: { baseDelayMs: 10, maxDelayMs: 10 },
      webSocketFactory: (_url, values) => {
        protocols.push(values);
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    const error = vi.fn();
    client.onError(error);
    client.subscribe("demo-room", () => {});
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]!.open();
    sockets[0]!.receive({
      version: PROTOCOL_VERSION,
      type: "error",
      code: "token_expired",
      message: "Expired",
      fatal: false,
    });
    sockets[0]!.disconnect(4001);
    await vi.advanceTimersByTimeAsync(10);
    expect(protocols[1]).toContain("pulse-auth.fresh-token");
    expect(error).not.toHaveBeenCalled();
    sockets[1]!.open();
    sockets[1]!.receive({
      version: PROTOCOL_VERSION,
      type: "error",
      code: "forbidden",
      message: "Forbidden",
      fatal: true,
    });
    client.subscribe("another-room", () => {});
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(2);
    client.dispose();
  });
  it("deduplicates events and resumes from the latest cursor", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const sockets: FakeWebSocket[] = [];
    const listener = vi.fn();
    const states: string[] = [];
    const client = createPulseClient({
      baseUrl: "https://api.example.com",
      getToken: () => "demo-token",
      reconnect: { baseDelayMs: 10, maxDelayMs: 10, maxAttempts: 2 },
      webSocketFactory: () => {
        const socket = new FakeWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.onConnectionState((state) => states.push(state));
    const unsubscribe = client.subscribe("demo-room", listener);
    await vi.advanceTimersByTimeAsync(0);

    const firstSocket = sockets[0];
    expect(firstSocket).toBeDefined();
    firstSocket?.open();
    firstSocket?.receive({
      version: PROTOCOL_VERSION,
      type: "ready",
      connectionId: "dcb9cf80-5523-4593-bb7c-8f349e327b46",
    });
    expect(states).toEqual(["offline", "connecting", "connected"]);
    expect(JSON.parse(firstSocket?.sent[0] ?? "{}")).toMatchObject({
      type: "subscribe",
      roomId: "demo-room",
    });

    const event: ServerFrame = {
      version: PROTOCOL_VERSION,
      type: "event",
      event: {
        eventId: "3",
        roomId: "demo-room",
        type: "message.created",
        payload: demoMessage,
      },
    };
    firstSocket?.receive(event);
    firstSocket?.receive(event);
    expect(listener).toHaveBeenCalledTimes(1);

    firstSocket?.disconnect();
    expect(states.at(-1)).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(10);
    const secondSocket = sockets[1];
    expect(secondSocket).toBeDefined();
    secondSocket?.open();
    secondSocket?.receive({
      version: PROTOCOL_VERSION,
      type: "ready",
      connectionId: "75da10af-f949-4664-92de-d03cf6f9e2ca",
    });
    expect(states.at(-1)).toBe("connected");
    expect(JSON.parse(secondSocket?.sent[0] ?? "{}")).toMatchObject({
      type: "subscribe",
      roomId: "demo-room",
      cursor: "3",
    });

    unsubscribe();
    client.dispose();
    expect(states.at(-1)).toBe("offline");
  });
});
