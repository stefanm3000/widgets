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
