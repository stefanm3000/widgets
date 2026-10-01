import { expect, test, type WebSocketRoute } from "@playwright/test";

let browserClient = 0;
for (const [partner, url] of [
  ["Vanilla", "http://localhost:5174"],
  ["Vue", "http://localhost:5175"],
  ["React", "http://localhost:5173"],
] as const) {
  const clientIp = `192.0.2.${++browserClient}`;
  test(`recovers idle subscriptions and automatically loads anchored history in ${partner}`, async ({
    page,
    request,
  }) => {
    await page.setExtraHTTPHeaders({ "x-pulse-test-client-ip": clientIp });
    await page.route("**/api/auth/demo-token", async (route) => {
      const response = await route.fetch({
        url: "http://127.0.0.1:4000/__test__/auth/demo-token",
      });
      await route.fulfill({ response });
    });
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
    await page.goto(url);
    const widget = page.locator('[part="root"]');
    await expect.poll(() => subscriptions).toBe(1);
    const credentials = await (await session).json();
    const headers = {
      authorization: `Bearer ${credentials.accessToken}`,
      "x-pulse-test-client-ip": clientIp,
    };
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
    await expect(widget.locator('[data-slot="bubble-content"]')).toHaveCount(
      50,
    );
    let paginationRequests = 0;
    let releasePage: (() => void) | undefined;
    await page.route("**/api/rooms/*/messages?*", async (route) => {
      if (new URL(route.request().url()).searchParams.has("cursor")) {
        paginationRequests += 1;
        await new Promise<void>((resolve) => {
          releasePage = resolve;
        });
      }
      await route.continue();
    });
    for (const count of [100, 101]) {
      await viewport.hover();
      await page.mouse.wheel(0, -100_000);
      await expect
        .poll(() => viewport.evaluate((element) => element.scrollTop))
        .toBe(0);
      const anchorId = await widget
        .locator("[data-message-id]")
        .first()
        .getAttribute("data-message-id");
      const anchor = widget.locator(`[data-message-id="${anchorId}"]`);
      const previousTop = (await anchor.boundingBox())!.y;
      await expect(
        widget.getByRole("button", { name: "Loading earlier messages…" }),
      ).toBeDisabled();
      await expect.poll(() => paginationRequests).toBe(count === 100 ? 1 : 2);
      releasePage?.();
      await expect(widget.locator('[data-slot="bubble-content"]')).toHaveCount(
        count,
      );
      await expect
        .poll(async () =>
          Math.abs((await anchor.boundingBox())!.y - previousTop),
        )
        .toBeLessThan(3);
    }
    await expect(
      widget.getByRole("button", { name: "Load earlier messages" }),
    ).toHaveCount(0);
  });
}
