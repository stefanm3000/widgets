import {
  PROTOCOL_VERSION,
  serverFrameSchema,
  type RealtimeEvent,
} from "@pulse/protocol";

import { createRealtimeUrl } from "../helpers/urls.js";
import type {
  ConnectionState,
  PulseWebSocket,
  ReconnectOptions,
} from "../types.js";

type EventListener = (event: RealtimeEvent) => void;
type StateListener = (state: ConnectionState) => void;
type RefetchListener = (roomId: string) => void;
type ErrorListener = (error: Error) => void;

interface PulseRealtimeClientOptions {
  baseUrl: URL;
  getToken: () => Promise<string>;
  reconnect?: ReconnectOptions;
  webSocketFactory?: (url: string, protocols: string[]) => PulseWebSocket;
}

const OPEN = 1;

function defaultWebSocketFactory(
  url: string,
  protocols: string[],
): PulseWebSocket {
  return new WebSocket(url, protocols);
}

export class PulseRealtimeClient {
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

  constructor(private readonly options: PulseRealtimeClientOptions) {
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

  dispose(): void {
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

      const socket = this.webSocketFactory(
        createRealtimeUrl(this.options.baseUrl),
        ["pulse.v1", `pulse-auth.${token}`],
      );
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
