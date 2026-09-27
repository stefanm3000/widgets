import { expect, test } from "@playwright/test";

test("sends a message in Vanilla", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Vanilla", exact: true }),
  ).toBeVisible();

  const widget = page.locator("pulse-chat");
  await expect(widget).toHaveCount(1);
  await expect(
    widget.getByText("Welcome to the live chat demo."),
  ).toBeVisible();

  const input = widget.getByRole("textbox", { name: "Message", exact: true });
  const sendButton = widget.getByRole("button", { name: "Send" });
  await expect(input).toBeEnabled();

  const message = `Partner browser smoke ${Date.now()}`;
  await input.fill(message);
  await sendButton.click();
  await expect(widget.getByText(message)).toBeVisible();

  const shellBounds = await page.locator(".app-shell").boundingBox();
  const inputBounds = await input.boundingBox();
  const sendButtonBounds = await sendButton.boundingBox();
  const viewportHeight = await page.evaluate(() => globalThis.innerHeight);
  expect(shellBounds).not.toBeNull();
  expect(
    Math.abs((shellBounds?.height ?? 0) - viewportHeight * 0.8),
  ).toBeLessThan(2);
  expect(inputBounds).not.toBeNull();
  expect(sendButtonBounds).not.toBeNull();
  expect((inputBounds?.x ?? 0) + (inputBounds?.width ?? 0)).toBeLessThanOrEqual(
    sendButtonBounds?.x ?? 0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= globalThis.innerHeight,
    ),
  ).toBe(true);

  await page.reload();
  await expect(page.locator("pulse-chat").getByText(message)).toBeVisible();
});
