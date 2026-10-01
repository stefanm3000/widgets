import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expect, test } from "@playwright/test";
import {
  demoTokenResponseSchema,
  messagePageSchema,
  roomSchema,
  sendMessageResponseSchema,
} from "@pulse/protocol";

test("MCP reads widget messages and writes live to Vanilla and Vue", async ({
  context,
  request,
}) => {
  const tokenResponse = await request.get(
    "http://127.0.0.1:4000/test/mcp-credentials",
  );
  expect(tokenResponse.ok()).toBe(true);
  const issued = await tokenResponse.json();
  const credentials = {
    playground: demoTokenResponseSchema.parse(issued.playground),
    vanilla: demoTokenResponseSchema.parse(issued.vanilla),
    vue: demoTokenResponseSchema.parse(issued.vue),
  };
  const { accessToken } = credentials.playground;
  // The API fixture signs real, separate identities. Reuse them on reload;
  // HTTP reads, writes, room authorization, and WebSockets remain real.
  await context.route("**/api/auth/demo-token", (route) => {
    const source = route.request().postDataJSON().source;
    expect(["vanilla", "vue"]).toContain(source);
    return route.fulfill({
      json: source === "vanilla" ? credentials.vanilla : credentials.vue,
    });
  });
  const client = new Client({ name: "pulse-browser-test", version: "0.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../../mcp/dist/stdio.js", import.meta.url))],
    env: {
      PULSE_API_URL: "http://127.0.0.1:4000",
      PULSE_ACCESS_TOKEN: accessToken,
    },
    stderr: "pipe",
  });
  await client.connect(transport);
  try {
    const roomResult = await client.callTool({
      name: "get_room",
      arguments: { roomId: "demo-room" },
    });
    expect(roomResult.isError).not.toBe(true);
    expect(
      roomSchema.parse((roomResult.structuredContent as { room: unknown }).room)
        .id,
    ).toBe("demo-room");

    const channelName = `MCP ${randomUUID()}`;
    const created = await client.callTool({
      name: "create_channel",
      arguments: { roomId: "demo-room", name: channelName },
    });
    expect(created.isError).not.toBe(true);
    const channel = roomSchema.parse(
      (created.structuredContent as { room: unknown }).room,
    );
    const channels = await client.callTool({
      name: "list_channels",
      arguments: { roomId: "demo-room" },
    });
    expect(channels.isError).not.toBe(true);
    expect(JSON.stringify(channels.structuredContent)).toContain(channel.id);

    const vanilla = await context.newPage();
    const vue = await context.newPage();
    await Promise.all([
      vanilla.goto("http://localhost:5174"),
      vue.goto("http://localhost:5175"),
    ]);
    const widgets = [vanilla.locator("pulse-chat"), vue.locator("pulse-chat")];
    for (const widget of widgets) {
      await widget
        .getByRole("button", { name: channelName, exact: true })
        .click();
      await expect(
        widget.getByRole("heading", { name: channelName }),
      ).toBeVisible();
      await expect(
        widget.getByRole("textbox", { name: "Message", exact: true }),
      ).toBeEnabled();
    }

    // Send through the widget, then read that committed message through MCP.
    const widgetBody = `From Vanilla ${randomUUID()}`;
    const first = widgets[0]!;
    await first
      .getByRole("textbox", { name: "Message", exact: true })
      .fill(widgetBody);
    await first.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      widgets[1]!
        .getByRole("region", { name: "Chat messages" })
        .getByText(widgetBody, { exact: true }),
    ).toBeVisible();
    const history = await client.callTool({
      name: "get_messages",
      arguments: { roomId: channel.id, limit: 1 },
    });
    expect(history.isError).not.toBe(true);
    expect(
      messagePageSchema.parse(history.structuredContent).items[0]?.body,
    ).toBe(widgetBody);

    const body = `From MCP ${randomUUID()}`;
    const args = { roomId: channel.id, body, clientMessageId: randomUUID() };
    const sent = await client.callTool({
      name: "send_message",
      arguments: args,
    });
    expect(sent.isError).not.toBe(true);
    const sentMessage = sendMessageResponseSchema.parse(
      sent.structuredContent,
    ).message;
    const retried = await client.callTool({
      name: "send_message",
      arguments: args,
    });
    expect(retried.isError).not.toBe(true);
    expect(
      sendMessageResponseSchema.parse(retried.structuredContent).message.id,
    ).toBe(sentMessage.id);
    for (const widget of widgets) {
      const bubble = widget
        .getByRole("region", { name: "Chat messages" })
        .getByText(body, { exact: true });
      await expect(bubble).toBeVisible();
      await expect(bubble).toHaveCount(1);
    }

    const latest = await client.callTool({
      name: "get_messages",
      arguments: { roomId: channel.id, limit: 1 },
    });
    const latestPage = messagePageSchema.parse(latest.structuredContent);
    expect(latestPage.items.map((message) => message.id)).toEqual([
      sentMessage.id,
    ]);
    expect(latestPage.nextCursor).not.toBeNull();
    const earlier = await client.callTool({
      name: "get_messages",
      arguments: {
        roomId: channel.id,
        cursor: latestPage.nextCursor,
        limit: 1,
      },
    });
    expect(
      messagePageSchema.parse(earlier.structuredContent).items[0]?.body,
    ).toBe(widgetBody);

    const forbidden = await client.callTool({
      name: "send_message",
      arguments: {
        ...args,
        roomId: "unrelated-room",
        clientMessageId: randomUUID(),
      },
    });
    expect(forbidden.isError).toBe(true);
    expect(JSON.stringify(forbidden)).toContain("does not have access");
    expect(JSON.stringify(forbidden)).not.toContain(accessToken);
    await Promise.all([vanilla.reload(), vue.reload()]);
    for (const widget of widgets) {
      const restored = widget
        .getByRole("region", { name: "Chat messages" })
        .getByText(body, { exact: true });
      await expect(restored).toBeVisible();
      await expect(restored).toHaveCount(1);
    }
  } finally {
    await client.close();
  }
});
