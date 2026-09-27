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

export interface ReconnectOptions {
  baseDelayMs?: number;
  maxAttempts?: number;
  maxDelayMs?: number;
}

export interface PulseClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getToken: () => string | Promise<string>;
  reconnect?: ReconnectOptions;
  webSocketFactory?: (url: string, protocols: string[]) => PulseWebSocket;
}

export interface GetMessagesOptions {
  cursor?: string;
  limit?: number;
}
