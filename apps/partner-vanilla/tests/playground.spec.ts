import { expect, test } from "@playwright/test";

test("shows equal columns, restores source URL state, and supports keyboard popovers", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("http://localhost:5173?file=vue%2FApp.vue&partner=smoke");

  const widget = page.locator('[part="root"]');
  const code = page.locator('[data-slot="card"]');
  const input = widget.getByRole("textbox", { name: "Message", exact: true });
  await expect(input).toBeEnabled();
  await expect(widget).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".syntax-highlight")).toContainText(
    "<script setup>",
  );
  const widgetBounds = (await widget.boundingBox())!;
  const codeBounds = (await code.boundingBox())!;
  expect(Math.abs(widgetBounds.width - codeBounds.width)).toBeLessThan(1);

  const trigger = widget.getByRole("button", {
    name: "New channel",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const popover = widget.getByRole("dialog", { name: "New channel" });
  await expect(popover).toBeVisible();
  const name = popover.getByRole("textbox", { name: "Channel name" });
  await expect(name).toBeFocused();
  await name.fill("Temporary name");
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(name).toHaveValue("");
  await popover.getByRole("button", { name: "Cancel" }).click();
  await expect(trigger).toBeFocused();

  await page.getByText("main.js", { exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("file"))
    .toBe("vanilla/main.js");
  await page.reload();
  await expect(page.locator(".syntax-highlight")).toContainText(
    "window.addEventListener",
  );
  expect(new URL(page.url()).searchParams.get("partner")).toBe("smoke");
  await page.screenshot({
    path: testInfo.outputPath("playground-desktop.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    widget.getByRole("button", { name: "Collapse channels" }),
  ).toBeVisible();
  await widget.getByRole("button", { name: "Collapse channels" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    widget.getByRole("button", { name: "Expand channels" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
