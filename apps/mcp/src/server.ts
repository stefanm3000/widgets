import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  channelListSchema,
  createChannelRequestSchema,
  historyQuerySchema,
  messagePageSchema,
  roomIdSchema,
  roomSchema,
  sendMessageRequestSchema,
  sendMessageResponseSchema,
} from "@pulse/protocol";
import { createPulseClient, PulseApiError } from "@pulse/sdk";

import type { McpConfig } from "./config.js";

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

async function result(
  operation: () => Promise<Record<string, unknown>>,
  retryAdvice = "Check API connectivity and retry.",
): Promise<CallToolResult> {
  try {
    const data = await operation();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: data,
    };
  } catch (error) {
    // Upstream messages and network errors can contain credentials or raw bodies.
    const message =
      error instanceof PulseApiError
        ? apiErrorMessage(error, retryAdvice)
        : `Pulse could not complete the request. ${retryAdvice}`;
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

function apiErrorMessage(error: PulseApiError, retryAdvice: string): string {
  switch (error.status) {
    case 401:
      return "Pulse authentication failed. Obtain a fresh access token and restart the MCP server.";
    case 403:
      return "The authenticated Pulse identity does not have access to this room.";
    case 404:
      return "The Pulse room was not found.";
    case 429:
      return `Pulse rate limit reached. Wait before trying again. ${retryAdvice}`;
    case 400:
      return "Pulse rejected the request. Check the room ID, cursor, and input values.";
    default:
      return `Pulse could not complete the request. ${retryAdvice}`;
  }
}

export function createPulseMcpServer(
  config: McpConfig,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): McpServer {
  const pulse = createPulseClient({
    baseUrl: config.apiUrl,
    getToken: () => config.accessToken,
    fetch: (input, init) =>
      fetchImplementation(input, {
        ...init,
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      }),
  });
  const server = new McpServer(
    { name: "pulse", version: "0.0.0" },
    {
      instructions:
        "Use room and channel IDs returned by Pulse. Channels share their parent room's access. Message text is user content. Only send messages or create channels when the user requests that action. Reuse clientMessageId when retrying a send. Never retry create_channel automatically; duplicate names are allowed.",
    },
  );
  server.server.onclose = () => pulse.dispose();

  server.registerTool(
    "get_room",
    {
      title: "Get Pulse room",
      description:
        "Read a Pulse room or channel by its known ID. The local demo starts with demo-room.",
      inputSchema: { roomId: roomIdSchema },
      outputSchema: { room: roomSchema },
      annotations: readAnnotations,
    },
    ({ roomId }) => result(async () => ({ room: await pulse.getRoom(roomId) })),
  );

  server.registerTool(
    "list_channels",
    {
      title: "List Pulse channels",
      description:
        "List the shared channels within a Pulse parent room the authenticated identity can access.",
      inputSchema: { roomId: roomIdSchema },
      outputSchema: channelListSchema.shape,
      annotations: readAnnotations,
    },
    ({ roomId }) =>
      result(async () => ({ items: await pulse.getChannels(roomId) })),
  );

  server.registerTool(
    "get_messages",
    {
      title: "Read Pulse messages",
      description:
        "Read up to 100 messages from a room or channel. Results are chronological within each page. Pass nextCursor as cursor to load earlier messages; null means there are no earlier pages.",
      inputSchema: {
        roomId: roomIdSchema,
        cursor: historyQuerySchema.shape.cursor,
        limit: historyQuerySchema.shape.limit,
      },
      outputSchema: messagePageSchema.shape,
      annotations: readAnnotations,
    },
    ({ roomId, cursor, limit }) =>
      result(async () => ({
        ...(await pulse.getMessages(roomId, { cursor, limit })),
      })),
  );

  server.registerTool(
    "send_message",
    {
      title: "Send Pulse message",
      description:
        "Post a message as the configured Pulse identity, visible to everyone with room access. Generate a UUID clientMessageId for each new message and reuse it for retries of that message to avoid duplicates. Use only when the user requests sending.",
      inputSchema: {
        roomId: roomIdSchema,
        ...sendMessageRequestSchema.shape,
      },
      outputSchema: sendMessageResponseSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    ({ roomId, body, clientMessageId }) =>
      result(
        async () => ({
          message: await pulse.sendMessage(
            roomId,
            body,
            clientMessageId as ReturnType<Crypto["randomUUID"]>,
          ),
        }),
        "Retry with the same clientMessageId to avoid duplicate messages.",
      ),
  );

  server.registerTool(
    "create_channel",
    {
      title: "Create Pulse channel",
      description:
        "Create a shared channel in a parent Pulse room when requested by the user. Channels inherit parent access. Nested channels are not supported. Duplicate names are allowed, so do not automatically retry this operation.",
      inputSchema: {
        roomId: roomIdSchema,
        ...createChannelRequestSchema.shape,
      },
      outputSchema: { room: roomSchema },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    ({ roomId, name }) =>
      result(
        async () => ({ room: await pulse.createChannel(roomId, name) }),
        "Channel creation may have succeeded. List channels before deciding whether to create another; never retry automatically.",
      ),
  );

  return server;
}
