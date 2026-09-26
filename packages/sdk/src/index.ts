import {
  apiErrorSchema,
  messagePageSchema,
  PROTOCOL_VERSION,
  roomSchema,
  sendMessageResponseSchema,
  serverFrameSchema,
  type MessagePage,
  type RealtimeEvent,
  type Room,
} from "@pulse/protocol";

export type { Message, RealtimeEvent, Room } from "@pulse/protocol";

export type ConnectionState =
  "connecting" | "connected" | "reconnecting" | "offline";

export interface PulseWebSocket {
  readonly readyState: number;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onopen: ((event: Event) => void) | null;
  close(code?: number, reason?: string): void;
  send(data: string): void;
}

export interface PulseClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getToken: () => string | Promise<string>;
  reconnect?: {
    baseDelayMs?: number;
    maxAttempts?: number;
    maxDelayMs?: number;
  };
  webSocketFactory?: (url: string, protocols: string[]) => PulseWebSocket;
}

export interface GetMessagesOptions {
  cursor?: string;
  limit?: number;
}

export class PulseApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "PulseApiError";
  }
}

type EventListener = (event: RealtimeEvent) => void;
type StateListener = (state: ConnectionState) => void;
type RefetchListener = (roomId: string) => void;
type ErrorListener = (error: Error) => void;

const OPEN = 1;

function normalizeBaseUrl(baseUrl: string): URL {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/`;
  url.search = "";
  url.hash = "";
  return url;
}

function realtimeUrl(baseUrl: URL): string {
  const url = new URL("realtime", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function defaultWebSocketFactory(
  url: string,
  protocols: string[],
): PulseWebSocket {
  return new WebSocket(url, protocols);
}

async function responseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new PulseApiError(
      "The API returned invalid JSON",
      response.status,
      "invalid_response",
    );
  }
}

export class PulseClient {
  private readonly baseUrl: URL;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly subscriptions = new Map<string, Set<EventListener>>();
  private readonly stateListeners = new Set<StateListener>();
  private readonly refetchListeners = new Set<RefetchListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly cursors = new Map<string, string>();
  private readonly seenMessageIds = new Set<string>();
  private readonly webSocketFactory: (
    url: string,
    protocols: string[],
  ) => PulseWebSocket;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly maxAttempts: number;
  private socket: PulseWebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting = false;
  private disposed = false;
  private hasConnected = false;
  private reconnectAttempts = 0;
  private state: ConnectionState = "offline";

  constructor(private readonly options: PulseClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImplementation =
      options.fetch ?? globalThis.fetch.bind(globalThis);
    this.webSocketFactory = options.webSocketFactory ?? defaultWebSocketFactory;
    this.baseDelayMs = options.reconnect?.baseDelayMs ?? 250;
    this.maxDelayMs = options.reconnect?.maxDelayMs ?? 5_000;
    this.maxAttempts = options.reconnect?.maxAttempts ?? 8;

    globalThis.addEventListener?.("online", this.handleOnline);
    globalThis.document?.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  async getRoom(roomId: string): Promise<Room> {
    const data = await this.request(`rooms/${encodeURIComponent(roomId)}`);
    return roomSchema.parse(data);
  }

  async getMessages(
    roomId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagePage> {
    const query = new URLSearchParams();
    if (options.cursor) query.set("cursor", options.cursor);
    if (options.limit) query.set("limit", String(options.limit));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const data = await this.request(
      `rooms/${encodeURIComponent(roomId)}/messages${suffix}`,
    );
    return messagePageSchema.parse(data);
  }

  async sendMessage(
    roomId: string,
    body: string,
    clientMessageId = globalThis.crypto.randomUUID(),
  ) {
    const data = await this.request(
      `rooms/${encodeURIComponent(roomId)}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientMessageId, body }),
      },
    );
    return sendMessageResponseSchema.parse(data).message;
  }

  subscribe(roomId: string, listener: EventListener): () => void {
    if (this.disposed) throw new Error("PulseClient has been disposed");
    const listeners =
      this.subscriptions.get(roomId) ?? new Set<EventListener>();
    const isNewRoom = listeners.size === 0;
    listeners.add(listener);
    this.subscriptions.set(roomId, listeners);

    if (
      isNewRoom &&
      this.socket?.readyState === OPEN &&
      this.state === "connected"
    ) {
      this.sendSubscribe(roomId);
    } else {
      void this.connect();
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size > 0) return;
      this.subscriptions.delete(roomId);
      if (this.socket?.readyState === OPEN) {
        this.socket.send(
          JSON.stringify({
            version: PROTOCOL_VERSION,
            type: "unsubscribe",
            roomId,
          }),
        );
      }
      if (this.subscriptions.size === 0) this.stopSocket();
    };
  }

  onConnectionState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  onRefetchRequired(listener: RefetchListener): () => void {
    this.refetchListeners.add(listener);
    return () => this.refetchListeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.subscriptions.clear();
    this.stateListeners.clear();
    this.refetchListeners.clear();
    this.errorListeners.clear();
    globalThis.removeEventListener?.("online", this.handleOnline);
    globalThis.document?.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.stopSocket();
  }

  private readonly handleOnline = () => {
    if (!this.disposed && this.subscriptions.size > 0 && !this.socket) {
      this.reconnectAttempts = 0;
      void this.connect();
    }
  };

  private readonly handleVisibilityChange = () => {
    if (globalThis.document?.visibilityState === "visible") this.handleOnline();
  };

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const token = await this.options.getToken();
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    const response = await this.fetchImplementation(
      new URL(path, this.baseUrl),
      {
        ...init,
        headers,
      },
    );
    const data = await responseJson(response);
    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(data);
      if (parsed.success) {
        throw new PulseApiError(
          parsed.data.error.message,
          response.status,
          parsed.data.error.code,
          parsed.data.error.requestId,
        );
      }
      throw new PulseApiError(
        "Pulse API request failed",
        response.status,
        "unknown_error",
      );
    }
    return data;
  }

  private async connect() {
    if (
      this.disposed ||
      this.connecting ||
      this.socket ||
      this.subscriptions.size === 0
    )
      return;

    this.connecting = true;
    this.setState(this.hasConnected ? "reconnecting" : "connecting");
    try {
      const token = await this.options.getToken();
      if (this.disposed || this.subscriptions.size === 0) return;

      const socket = this.webSocketFactory(realtimeUrl(this.baseUrl), [
        "pulse.v1",
        `pulse-auth.${token}`,
      ]);
      this.socket = socket;
      socket.onmessage = (event) => this.handleMessage(socket, event.data);
      socket.onerror = () =>
        this.emitError(new Error("Realtime connection failed"));
      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.scheduleReconnect();
      };
    } catch (error) {
      this.emitError(
        error instanceof Error ? error : new Error("Could not connect"),
      );
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private handleMessage(socket: PulseWebSocket, data: unknown) {
    if (socket !== this.socket || typeof data !== "string") return;

    let input: unknown;
    try {
      input = JSON.parse(data);
    } catch {
      this.emitError(new Error("Realtime server sent invalid JSON"));
      return;
    }
    const parsed = serverFrameSchema.safeParse(input);
    if (!parsed.success) {
      this.emitError(new Error("Realtime server sent an invalid frame"));
      return;
    }

    const frame = parsed.data;
    if (frame.type === "ready") {
      this.hasConnected = true;
      this.reconnectAttempts = 0;
      this.setState("connected");
      for (const roomId of this.subscriptions.keys())
        this.sendSubscribe(roomId);
      return;
    }
    if (frame.type === "ping") {
      socket.send(
        JSON.stringify({
          version: PROTOCOL_VERSION,
          type: "pong",
          timestamp: frame.timestamp,
        }),
      );
      return;
    }
    if (frame.type === "event") {
      this.cursors.set(frame.event.roomId, frame.event.eventId);
      const messageId = frame.event.payload.id;
      if (this.seenMessageIds.has(messageId)) return;
      this.seenMessageIds.add(messageId);
      if (this.seenMessageIds.size > 1_000) {
        const oldest = this.seenMessageIds.values().next().value;
        if (oldest) this.seenMessageIds.delete(oldest);
      }
      for (const listener of this.subscriptions.get(frame.event.roomId) ?? []) {
        listener(frame.event);
      }
      return;
    }
    if (frame.type === "refetch_required") {
      this.cursors.delete(frame.roomId);
      for (const listener of this.refetchListeners) listener(frame.roomId);
      return;
    }
    if (frame.type === "error") {
      this.emitError(new Error(frame.message));
      if (frame.fatal) {
        this.reconnectAttempts = this.maxAttempts;
        socket.close(1008, frame.message.slice(0, 123));
      }
    }
  }

  private sendSubscribe(roomId: string) {
    if (this.socket?.readyState !== OPEN) return;
    this.socket.send(
      JSON.stringify({
        version: PROTOCOL_VERSION,
        type: "subscribe",
        roomId,
        cursor: this.cursors.get(roomId),
      }),
    );
  }

  private scheduleReconnect() {
    if (this.disposed || this.subscriptions.size === 0) {
      this.setState("offline");
      return;
    }
    if (this.reconnectAttempts >= this.maxAttempts) {
      this.setState("offline");
      return;
    }

    this.reconnectAttempts += 1;
    this.setState("reconnecting");
    const exponential = Math.min(
      this.maxDelayMs,
      this.baseDelayMs * 2 ** (this.reconnectAttempts - 1),
    );
    const delay = Math.round(exponential * (0.75 + Math.random() * 0.5));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private stopSocket() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "Client stopped");
    this.setState("offline");
  }

  private setState(state: ConnectionState) {
    if (state === this.state) return;
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }

  private emitError(error: Error) {
    for (const listener of this.errorListeners) listener(error);
  }
}

export function createPulseClient(options: PulseClientOptions): PulseClient {
  return new PulseClient(options);
}
