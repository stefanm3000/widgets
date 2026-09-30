import {
  apiErrorSchema,
  channelListSchema,
  createChannelRequestSchema,
  messagePageSchema,
  roomSchema,
  sendMessageResponseSchema,
  type Message,
  type MessagePage,
  type Room,
} from "@pulse/protocol";

import { PulseApiError } from "../errors/pulse-api-error.js";
import { responseJson } from "../helpers/response.js";
import type { GetMessagesOptions } from "../types.js";

interface PulseHttpClientOptions {
  baseUrl: URL;
  fetchImplementation: typeof globalThis.fetch;
  getToken: () => Promise<string>;
}

export class PulseHttpClient {
  constructor(private readonly options: PulseHttpClientOptions) {}

  async getChannels(roomId: string): Promise<Room[]> {
    return channelListSchema.parse(
      await this.request(`rooms/${encodeURIComponent(roomId)}/channels`),
    ).items;
  }

  async createChannel(roomId: string, name: string): Promise<Room> {
    const body = createChannelRequestSchema.parse({ name });
    return roomSchema.parse(
      await this.request(`rooms/${encodeURIComponent(roomId)}/channels`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
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
    clientMessageId: ReturnType<
      Crypto["randomUUID"]
    > = globalThis.crypto.randomUUID(),
  ): Promise<Message> {
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

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const token = await this.options.getToken();
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    const response = await this.options.fetchImplementation(
      new URL(path, this.options.baseUrl),
      { ...init, headers },
    );
    const data = await responseJson(response);

    if (response.ok) return data;

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
}
