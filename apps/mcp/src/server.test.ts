import { randomUUID } from "node:crypto";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPulseMcpServer } from "./server.js";

const room = {
  id: "demo-room",
  name: "Live chat demo",
  description: null,
  createdAt: "2026-10-01T00:00:00.000Z",
};
const message = {
  id: randomUUID(),
  clientMessageId: randomUUID(),
  roomId: room.id,
  sender: {
    id: randomUUID(),
    displayName: "Demo sender",
    source: "playground",
  },
  body: "Hello",
  createdAt: room.createdAt,
};
const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

async function connect(fetchImplementation: typeof globalThis.fetch) {
  const server = createPulseMcpServer(
    { apiUrl: "http://127.0.0.1:4000", accessToken: "private-token" },
    fetchImplementation,
  );
  const client = new Client({ name: "pulse-test", version: "0.0.0" });
  clients.push(client);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

describe("Pulse MCP tools", () => {
  it("advertises schemas and accurate write annotations", async () => {
    const client = await connect(vi.fn());
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual([
      "get_room",
      "list_channels",
      "get_messages",
      "send_message",
      "create_channel",
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema?.type).toBe("object");
      expect(tool.annotations?.destructiveHint).toBe(false);
    }
    expect(
      tools.find((tool) => tool.name === "get_messages")?.annotations
        ?.readOnlyHint,
    ).toBe(true);
    expect(
      tools.find((tool) => tool.name === "send_message")?.annotations,
    ).toMatchObject({
      readOnlyHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
    expect(
      tools.find((tool) => tool.name === "create_channel")?.annotations,
    ).toMatchObject({ readOnlyHint: false, idempotentHint: false });
  });

  it("uses authenticated SDK requests and preserves pagination and retry IDs", async () => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>();
    const replies = [
      { room: room },
      { items: [room] },
      { items: [message], nextCursor: "10" },
      { message },
      { message },
      { room },
    ];
    // Room endpoints return the DTO directly; MCP wraps it for structured output.
    for (const data of [
      room,
      replies[1],
      replies[2],
      replies[3],
      replies[4],
      room,
    ]) {
      fetchImplementation.mockResolvedValueOnce(Response.json(data));
    }
    const client = await connect(fetchImplementation);
    const calls = [
      { name: "get_room", arguments: { roomId: room.id } },
      { name: "list_channels", arguments: { roomId: room.id } },
      {
        name: "get_messages",
        arguments: { roomId: room.id, cursor: "20", limit: 1 },
      },
      {
        name: "send_message",
        arguments: {
          roomId: room.id,
          body: " Hello ",
          clientMessageId: message.clientMessageId,
        },
      },
      {
        name: "send_message",
        arguments: {
          roomId: room.id,
          body: "Hello",
          clientMessageId: message.clientMessageId,
        },
      },
      {
        name: "create_channel",
        arguments: { roomId: room.id, name: " Design " },
      },
    ];
    for (const [index, call] of calls.entries()) {
      const result = await client.callTool(call);
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual(replies[index]);
      expect(JSON.stringify(result)).not.toContain("private-token");
    }
    for (const [, init] of fetchImplementation.mock.calls) {
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer private-token",
      );
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
    expect(String(fetchImplementation.mock.calls[2]?.[0])).toBe(
      "http://127.0.0.1:4000/rooms/demo-room/messages?cursor=20&limit=1",
    );
    expect(fetchImplementation.mock.calls[3]?.[1]?.body).toBe(
      fetchImplementation.mock.calls[4]?.[1]?.body,
    );
    expect(
      JSON.parse(String(fetchImplementation.mock.calls[5]?.[1]?.body)),
    ).toEqual({ name: "Design" });
  });

  it.each([
    ["get_room", { roomId: "../secret" }],
    ["get_messages", { roomId: room.id, limit: 101 }],
    ["get_messages", { roomId: room.id, cursor: "" }],
    ["send_message", { roomId: room.id, body: "Hello" }],
    [
      "send_message",
      { roomId: room.id, body: " ", clientMessageId: randomUUID() },
    ],
    [
      "send_message",
      {
        roomId: room.id,
        body: "x".repeat(501),
        clientMessageId: randomUUID(),
      },
    ],
    ["create_channel", { roomId: room.id, name: " " }],
  ])("rejects invalid %s input before touching Pulse", async (name, args) => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>();
    const client = await connect(fetchImplementation);
    // Invalid tool arguments can be returned as tool errors or JSON-RPC errors.
    const result = await client
      .callTool({ name, arguments: args })
      .catch(() => ({ isError: true }));
    expect(result.isError).toBe(true);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 429, 500])(
    "returns safe tool errors for HTTP %s",
    async (status) => {
      const client = await connect(
        vi.fn<typeof globalThis.fetch>().mockResolvedValue(
          Response.json(
            {
              error: {
                code: "unauthorized",
                message: "private-token",
                requestId: "private-token",
              },
            },
            { status },
          ),
        ),
      );
      const result = await client.callTool({
        name: "get_room",
        arguments: { roomId: room.id },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).not.toContain("private-token");
      if (status === 401)
        expect(JSON.stringify(result)).toContain("fresh access token");
      if (status === 403)
        expect(JSON.stringify(result)).toContain("does not have access");
    },
  );

  it("does not expose raw network errors or invalid upstream responses", async () => {
    const fetchImplementation = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error("private-token"))
      .mockResolvedValueOnce(Response.json({ accessToken: "private-token" }));
    const client = await connect(fetchImplementation);
    for (let index = 0; index < 2; index += 1) {
      const result = await client.callTool({
        name: "get_room",
        arguments: { roomId: room.id },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).not.toContain("private-token");
    }
  });

  it("warns about uncertain writes without automatically retrying them", async () => {
    const fetchImplementation = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new Error("Connection closed after commit"));
    const client = await connect(fetchImplementation);
    const sent = await client.callTool({
      name: "send_message",
      arguments: {
        roomId: room.id,
        body: "Hello",
        clientMessageId: message.clientMessageId,
      },
    });
    expect(sent.isError).toBe(true);
    expect(JSON.stringify(sent)).toContain("same clientMessageId");
    const created = await client.callTool({
      name: "create_channel",
      arguments: { roomId: room.id, name: "Design" },
    });
    expect(created.isError).toBe(true);
    expect(JSON.stringify(created)).toContain("may have succeeded");
    expect(JSON.stringify(created)).toContain("never retry automatically");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });
});
