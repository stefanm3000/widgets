import { expect, test } from "@playwright/test";

test("Svelte sends live to Vue and Vanilla, receives replies, and restores channel history", async ({
  context,
}) => {
  await context.route("**/api/auth/demo-token", async (route) => {
    const response = await route.fetch({
      url: "http://127.0.0.1:4000/__test__/auth/demo-token",
    });
    await route.fulfill({ response });
  });
  const svelte = await context.newPage();
  const vue = await context.newPage();
  const vanilla = await context.newPage();
  // Give these browsers their own normal request budgets in the API fixture.
  for (const [index, page] of [svelte, vue, vanilla].entries()) {
    await page.setExtraHTTPHeaders({
      "x-pulse-test-client-ip": `192.0.2.${101 + index}`,
    });
  }
  const errors: string[] = [];
  svelte.on("pageerror", (error) => errors.push(error.message));
  await Promise.all([
    svelte.goto("http://localhost:5176?partner=svelte"),
    vue.goto("http://localhost:5175"),
    vanilla.goto("http://localhost:5174"),
  ]);
  await expect(
    svelte.getByRole("main", { name: "Svelte chat widget example" }),
  ).toBeVisible();
  const widgets = [svelte, vue, vanilla].map((page) =>
    page.locator("pulse-chat"),
  );
  for (const widget of widgets) {
    await expect(
      widget.getByRole("textbox", { name: "Message", exact: true }),
    ).toBeEnabled();
  }
  const first = widgets[0]!;
  const channelName = `Svelte ${crypto.randomUUID()}`;
  await first.getByRole("button", { name: "New channel", exact: true }).click();
  await first.getByRole("textbox", { name: "Channel name" }).fill(channelName);
  await first
    .getByRole("button", { name: "Create channel", exact: true })
    .click();
  await expect(first.getByRole("heading", { name: channelName })).toBeVisible();
  await expect
    .poll(() =>
      new URL(svelte.url()).searchParams.get("pulse-channel:demo-room"),
    )
    .toBeTruthy();
  const channelId = new URL(svelte.url()).searchParams.get(
    "pulse-channel:demo-room",
  );

  for (const widget of widgets.slice(1)) {
    await widget.getByRole("button", { name: "Refresh channels" }).click();
    await widget
      .getByRole("button", { name: channelName, exact: true })
      .click();
    await expect(
      widget.getByRole("heading", { name: channelName }),
    ).toBeVisible();
  }
  const body = `From Svelte ${crypto.randomUUID()}`;
  await first.getByRole("textbox", { name: "Message", exact: true }).fill(body);
  await first.getByRole("button", { name: "Send", exact: true }).click();
  for (const widget of widgets) {
    const bubble = widget
      .locator('[data-slot="bubble"][data-source="svelte"]')
      .filter({ hasText: body });
    await expect(bubble).toHaveCount(1);
    await expect(bubble.locator('[data-slot="bubble-content"]')).toHaveCSS(
      "border-top-color",
      "rgb(255, 62, 0)",
    );
    await expect(
      widget
        .locator('[part="message"]')
        .filter({ hasText: body })
        .locator('[data-slot="message-source"]'),
    ).toHaveText("Svelte");
  }

  for (const widget of widgets.slice(1)) {
    const reply = `Reply ${crypto.randomUUID()}`;
    await widget
      .getByRole("textbox", { name: "Message", exact: true })
      .fill(reply);
    await widget.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      first
        .getByRole("region", { name: "Chat messages" })
        .getByText(reply, { exact: true }),
    ).toBeVisible();
  }
  const sessionId = await svelte.evaluate(() =>
    localStorage.getItem("pulse-svelte-session-id"),
  );
  expect(sessionId).toBeTruthy();
  await first
    .getByRole("button", { name: "Live chat demo", exact: true })
    .click();
  await expect(
    first.getByRole("heading", { name: "Live chat demo" }),
  ).toBeVisible();
  await svelte.goBack();
  await expect(first.getByRole("heading", { name: channelName })).toBeVisible();
  await svelte.goForward();
  await expect(
    first.getByRole("heading", { name: "Live chat demo" }),
  ).toBeVisible();
  await svelte.goBack();
  await expect(first.getByRole("heading", { name: channelName })).toBeVisible();
  await svelte.reload();
  await expect(first.getByRole("heading", { name: channelName })).toBeVisible();
  await expect(
    first
      .getByRole("region", { name: "Chat messages" })
      .getByText(body, { exact: true }),
  ).toBeVisible();
  expect(
    await svelte.evaluate(() =>
      localStorage.getItem("pulse-svelte-session-id"),
    ),
  ).toBe(sessionId);
  expect(new URL(svelte.url()).searchParams.get("partner")).toBe("svelte");
  expect(
    new URL(svelte.url()).searchParams.get("pulse-channel:demo-room"),
  ).toBe(channelId);
  await expect(
    first.locator('[part="message"]').filter({ hasText: body }),
  ).toContainText("(you)");

  await svelte.setViewportSize({ width: 390, height: 844 });
  await first.getByRole("button", { name: "Collapse channels" }).click();
  await expect(
    first.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeInViewport();
  expect(
    await svelte.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
