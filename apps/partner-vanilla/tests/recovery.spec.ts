import { expect, test, type WebSocketRoute } from "@playwright/test";

test("recovers idle subscriptions and preserves the reader while loading earlier history", async ({
  page,
  request,
}) => {
  const sockets: WebSocketRoute[] = [];
  let subscriptions = 0;
  await page.routeWebSocket("**/api/realtime", (socket) => {
    const server = socket.connectToServer();
    sockets.push(socket);
    server.onMessage((message) => {
      if (
        typeof message === "string" &&
        JSON.parse(message).type === "subscribed"
      )
        subscriptions += 1;
      socket.send(message);
    });
  });
  const session = page.waitForResponse("**/api/auth/demo-token");
  await page.goto("/");
  const widget = page.locator("pulse-chat");
  await expect.poll(() => subscriptions).toBe(1);
  const credentials = await (await session).json();
  const headers = { authorization: `Bearer ${credentials.accessToken}` };
  await sockets[0]!.close({ code: 1012, reason: "Test reconnect" });
  const body = `Sent during reconnect ${Date.now()}`;
  const sent = await request.post(
    "http://127.0.0.1:4000/rooms/demo-room/messages",
    { headers, data: { body, clientMessageId: crypto.randomUUID() } },
  );
  expect(sent.ok()).toBe(true);
  await expect.poll(() => subscriptions).toBe(2);
  await expect(
    widget.locator('[data-slot="bubble-content"]').filter({ hasText: body }),
  ).toHaveCount(1);
  await widget
    .getByRole("button", { name: "History pagination fixture", exact: true })
    .click();
  await expect(
    widget.getByRole("heading", { name: "History pagination fixture" }),
  ).toBeVisible();
  const viewport = widget.locator('[data-slot="message-scroller-viewport"]');
  await expect(widget.locator('[data-slot="bubble-content"]')).toHaveCount(50);
  await viewport.hover();
  await page.mouse.wheel(0, -100_000);
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBe(0);
  const anchor = widget
    .locator("[data-message-id]")
    .filter({ has: page.getByText("History row 1", { exact: true }) });
  const previousTop = (await anchor.boundingBox())!.y;
  await widget.getByRole("button", { name: "Load earlier messages" }).click();
  await expect(widget.locator('[data-slot="bubble-content"]')).toHaveCount(51);
  await expect
    .poll(async () => Math.abs((await anchor.boundingBox())!.y - previousTop))
    .toBeLessThan(3);
  await expect(
    widget.getByRole("button", { name: "Load earlier messages" }),
  ).toHaveCount(0);
});
