import type {
  Message,
  MessagePage,
  Participant,
  RealtimeEvent,
  Room,
} from "@pulse/protocol";

import { PulseCredentialsProvider } from "./auth/pulse-credentials-provider.js";
import { normalizeBaseUrl } from "./helpers/urls.js";
import { PulseHttpClient } from "./http/pulse-http-client.js";
import { PulseRealtimeClient } from "./realtime/pulse-realtime-client.js";
import type {
  ConnectionState,
  GetMessagesOptions,
  PulseClientOptions,
} from "./types.js";

export class PulseClient {
  readonly #credentials: PulseCredentialsProvider;
  readonly #http: PulseHttpClient;
  readonly #realtime: PulseRealtimeClient;

  constructor(options: PulseClientOptions) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    this.#credentials = new PulseCredentialsProvider(options.getToken);
    this.#http = new PulseHttpClient({
      baseUrl,
      fetchImplementation: options.fetch ?? globalThis.fetch.bind(globalThis),
      getToken: this.#credentials.getAccessToken,
    });
    this.#realtime = new PulseRealtimeClient({
      baseUrl,
      getToken: this.#credentials.getAccessToken,
      reconnect: options.reconnect,
      webSocketFactory: options.webSocketFactory,
    });
  }

  getChannels(roomId: string): Promise<Room[]> {
    return this.#http.getChannels(roomId);
  }

  createChannel(roomId: string, name: string): Promise<Room> {
    return this.#http.createChannel(roomId, name);
  }

  getRoom(roomId: string): Promise<Room> {
    return this.#http.getRoom(roomId);
  }

  getCurrentUser(): Promise<Participant | null> {
    return this.#credentials.getCurrentUser();
  }

  getMessages(
    roomId: string,
    options: GetMessagesOptions = {},
  ): Promise<MessagePage> {
    return this.#http.getMessages(roomId, options);
  }

  sendMessage(
    roomId: string,
    body: string,
    clientMessageId?: ReturnType<Crypto["randomUUID"]>,
  ): Promise<Message> {
    return this.#http.sendMessage(roomId, body, clientMessageId);
  }

  subscribe(
    roomId: string,
    listener: (event: RealtimeEvent) => void,
  ): () => void {
    return this.#realtime.subscribe(roomId, listener);
  }

  onConnectionState(listener: (state: ConnectionState) => void): () => void {
    return this.#realtime.onConnectionState(listener);
  }

  onRefetchRequired(listener: (roomId: string) => void): () => void {
    return this.#realtime.onRefetchRequired(listener);
  }

  onError(listener: (error: Error) => void): () => void {
    return this.#realtime.onError(listener);
  }

  dispose(): void {
    this.#realtime.dispose();
  }
}

export function createPulseClient(options: PulseClientOptions): PulseClient {
  return new PulseClient(options);
}
