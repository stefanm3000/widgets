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

  const widgetBounds = await widget.locator('[part="root"]').boundingBox();
  const viewportHeight = await page.evaluate(() => globalThis.innerHeight);
  expect(widgetBounds).not.toBeNull();
  expect(
    Math.abs((widgetBounds?.height ?? 0) - viewportHeight * 0.8),
  ).toBeLessThan(2);

  await page.reload();
  await expect(page.locator("pulse-chat").getByText(message)).toBeVisible();
});
