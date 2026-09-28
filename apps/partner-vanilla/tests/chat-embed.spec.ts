import { expect, test } from "@playwright/test";

test("sends a message in Vanilla", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("main", { name: "Vanilla chat widget example" }),
  ).toBeVisible();

  const widget = page.locator("pulse-chat");
  const transcript = widget.getByRole("region", { name: "Chat messages" });
  const transcriptViewport = widget.locator(
    '[data-slot="message-scroller-viewport"]',
  );
  await expect(widget).toHaveCount(1);
  await expect(
    transcript.getByText("Welcome to the live chat demo."),
  ).toBeVisible();
  expect(
    await transcriptViewport.evaluate(
      (element) => getComputedStyle(element).scrollbarWidth,
    ),
  ).toBe("none");

  const input = widget.getByRole("textbox", { name: "Message", exact: true });
  const sendButton = widget.getByRole("button", { name: "Send" });
  await expect(input).toBeEnabled();

  const message = `Partner browser smoke ${Date.now()}`;
  await input.fill(message);
  await sendButton.click();
  await expect(transcript.getByText(message)).toBeVisible();
  const messageBubble = transcript
    .locator('[data-slot="bubble"][data-source="vanilla"]')
    .filter({ hasText: message });
  await expect(messageBubble).toHaveCount(1);
  await expect(messageBubble.locator('[data-slot="bubble-content"]')).toHaveCSS(
    "border-top-color",
    "rgb(17, 17, 17)",
  );

  const stageBounds = await page.locator(".chat-stage").boundingBox();
  const inputBounds = await input.boundingBox();
  const sendButtonBounds = await sendButton.boundingBox();
  const viewportHeight = await page.evaluate(() => globalThis.innerHeight);
  expect(stageBounds).not.toBeNull();
  expect(stageBounds?.height).toBeLessThanOrEqual(viewportHeight * 0.86 + 1);
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
  await expect(
    page
      .locator("pulse-chat")
      .getByRole("region", { name: "Chat messages" })
      .getByText(message),
  ).toBeVisible();
});
