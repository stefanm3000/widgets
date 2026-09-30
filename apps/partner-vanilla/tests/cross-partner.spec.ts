import { expect, test, type Locator } from "@playwright/test";

async function expectAlignedHeaders(widget: Locator) {
  await expect(widget.locator('[part="sidebar-header"]')).toHaveCSS(
    "border-bottom-style",
    "solid",
  );
  await expect
    .poll(async () => {
      const bottom = (element: HTMLElement) =>
        element.offsetTop + element.offsetHeight;
      const sidebar = await widget
        .locator('[part="sidebar-header"]')
        .evaluate(bottom);
      const chat = await widget.locator('[part="header"]').evaluate(bottom);
      return Math.abs(sidebar - chat);
    })
    .toBeLessThan(1);
}

test("delivers Vanilla messages live to Vue and scrolls to the latest message", async ({
  context,
}) => {
  const vanillaPage = await context.newPage();
  const vuePage = await context.newPage();

  await Promise.all([
    vanillaPage.goto("http://localhost:5174"),
    vuePage.goto("http://localhost:5175"),
  ]);

  await expect(
    vanillaPage.getByRole("main", { name: "Vanilla chat widget example" }),
  ).toBeVisible();
  await expect(
    vuePage.getByRole("main", { name: "Vue chat widget example" }),
  ).toBeVisible();

  const vanillaWidget = vanillaPage.locator("pulse-chat");
  const vueWidget = vuePage.locator("pulse-chat");
  const vanillaInput = vanillaWidget.getByRole("textbox", {
    name: "Message",
    exact: true,
  });
  const vueInput = vueWidget.getByRole("textbox", {
    name: "Message",
    exact: true,
  });

  await expect(vanillaInput).toBeEnabled();
  await expect(vueInput).toBeEnabled();

  const vueViewport = vueWidget.locator(
    '[data-slot="message-scroller-viewport"]',
  );
  await vueViewport.evaluate((element) => {
    (element as HTMLElement).style.height = "80px";
  });

  const message = `Cross-partner message ${Date.now()}`;
  await vanillaInput.fill(message);
  await vanillaWidget.getByRole("button", { name: "Send" }).click();

  await expect(
    vueWidget.getByRole("region", { name: "Chat messages" }).getByText(message),
  ).toBeVisible();

  await expect
    .poll(() =>
      vueViewport.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    )
    .toBeGreaterThan(80);
  await expect
    .poll(() =>
      vueViewport.evaluate(
        (element) =>
          element.scrollHeight - element.clientHeight - element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(20);

  // Incoming messages should also bring a reader back from older messages.
  await vueViewport.hover();
  await vuePage.mouse.wheel(0, -10_000);
  await expect
    .poll(() => vueViewport.evaluate((element) => element.scrollTop))
    .toBe(0);

  const nextMessage = `${message} follow-up`;
  await vanillaInput.fill(nextMessage);
  await vanillaWidget.getByRole("button", { name: "Send" }).click();
  await expect(
    vueWidget
      .getByRole("region", { name: "Chat messages" })
      .getByText(nextMessage, { exact: true }),
  ).toBeInViewport();
  await expect
    .poll(() =>
      vueViewport.evaluate(
        (element) =>
          element.scrollHeight - element.clientHeight - element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(20);
});

test("creates a shared channel, switches history, and collapses the sidebar", async ({
  context,
}, testInfo) => {
  const vanilla = await context.newPage();
  const vue = await context.newPage();
  await Promise.all([
    vanilla.goto("http://localhost:5174"),
    vue.goto("http://localhost:5175"),
  ]);
  const first = vanilla.locator("pulse-chat");
  const second = vue.locator("pulse-chat");
  await expect(
    first.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeEnabled();
  await expect(
    second.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeEnabled();
  await expectAlignedHeaders(first);
  await expectAlignedHeaders(second);
  const channel = `Design ${Date.now()}`;
  await first.getByRole("button", { name: "New channel", exact: true }).click();
  await first.getByRole("textbox", { name: "Channel name" }).fill(channel);
  await first
    .getByRole("button", { name: "Create channel", exact: true })
    .click();
  await expect(first.getByRole("heading", { name: channel })).toHaveCount(1);
  await expect(
    first.getByRole("button", { name: "New channel", exact: true }),
  ).toBeFocused();
  await vanilla.screenshot({
    path: testInfo.outputPath("channels-expanded.png"),
  });
  await first.getByRole("button", { name: "Collapse channels" }).click();
  await expect(
    first.getByRole("button", { name: "Expand channels" }),
  ).toHaveAttribute("aria-expanded", "false");
  await second.getByRole("button", { name: "Refresh channels" }).click();
  await second.getByRole("button", { name: channel, exact: true }).click();
  const message = `Message in ${channel}`;
  await first
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(message);
  await first.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    second
      .getByRole("region", { name: "Chat messages" })
      .getByText(message, { exact: true }),
  ).toBeVisible();
  await first
    .getByRole("button", { name: "Live chat demo", exact: true })
    .click();
  await expect(
    first.getByRole("heading", { name: "Live chat demo" }),
  ).toBeVisible();
  await expect(
    first
      .getByRole("region", { name: "Chat messages" })
      .getByText(message, { exact: true }),
  ).toHaveCount(0);
  await first.getByRole("button", { name: channel, exact: true }).click();
  await expect(
    first
      .getByRole("region", { name: "Chat messages" })
      .getByText(message, { exact: true }),
  ).toBeVisible();
  await vanilla.reload();
  await expect(
    first.getByRole("button", { name: channel, exact: true }),
  ).toBeVisible();
  await first.getByRole("button", { name: channel, exact: true }).click();
  await expect(
    first
      .getByRole("region", { name: "Chat messages" })
      .getByText(message, { exact: true }),
  ).toBeVisible();

  await vanilla.setViewportSize({ width: 390, height: 844 });
  await expect(
    first.getByRole("button", { name: "Collapse channels" }),
  ).toBeVisible();
  await first.getByRole("button", { name: "Collapse channels" }).click();
  await vanilla.screenshot({
    path: testInfo.outputPath("channels-mobile.png"),
  });
  await expect(
    first.getByRole("button", { name: "Expand channels" }),
  ).toBeVisible();
  const sidebar = first.locator('[part="sidebar"]');
  const conversation = first.locator('[part="conversation"]');
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(49);
  const collapsedChatWidth = (await conversation.boundingBox())!.width;
  await expect(sidebar).toHaveCSS("transition-property", "width");
  await first.getByRole("button", { name: "Expand channels" }).click();
  await expect(
    first.getByRole("button", { name: "Collapse channels" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await sidebar.boundingBox())!.width)
    .toBeGreaterThan(100);
  await expectAlignedHeaders(first);
  const sidebarBounds = (await sidebar.boundingBox())!;
  const chatBounds = (await conversation.boundingBox())!;
  expect(sidebarBounds.x + sidebarBounds.width).toBeLessThanOrEqual(
    chatBounds.x + 1,
  );
  expect(chatBounds.width).toBeLessThan(collapsedChatWidth);
  for (const part of ["input", "send-button", "message-list"]) {
    const bounds = (await first.locator(`[part="${part}"]`).boundingBox())!;
    const rootBounds = (await first.locator('[part="root"]').boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      rootBounds.x + rootBounds.width + 1,
    );
  }
  await vanilla.screenshot({
    path: testInfo.outputPath("channels-mobile-expanded.png"),
  });
  await first.getByRole("button", { name: "Collapse channels" }).click();
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(49);
  await expect
    .poll(async () => (await conversation.boundingBox())!.width)
    .toBe(collapsedChatWidth);
  await expectAlignedHeaders(first);
  await vanilla.emulateMedia({ reducedMotion: "reduce" });
  await expect(sidebar).toHaveCSS("transition-duration", "0s");
  await expect(
    first.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
});
