import { expect, test } from "@playwright/test";

test("sends a message and survives an embed remount", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Answers that keep you moving." }),
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

  await page.getByRole("button", { name: "Unmount" }).click();
  await expect(widget).toHaveCount(0);
  await expect(page.getByText("Chat unmounted", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Remount" }).click();
  await expect(page.locator("pulse-chat")).toHaveCount(1);
  await expect(page.locator("pulse-chat").getByText(message)).toBeVisible();
});
