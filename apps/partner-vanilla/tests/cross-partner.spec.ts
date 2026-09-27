import { expect, test } from "@playwright/test";

test("delivers a vanilla message live to the Vue partner", async ({
  context,
}) => {
  const vanillaPage = await context.newPage();
  const vuePage = await context.newPage();

  await Promise.all([
    vanillaPage.goto("http://localhost:5174"),
    vuePage.goto("http://localhost:5175"),
  ]);

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

  const message = `Cross-partner message ${Date.now()}`;
  await vanillaInput.fill(message);
  await vanillaWidget.getByRole("button", { name: "Send" }).click();

  await expect(vueWidget.getByText(message)).toBeVisible();
});
