import { expect, test } from "@playwright/test";

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
