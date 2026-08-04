// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { expect, type Locator, type Page, test } from "@playwright/test";

async function openMenu(page: Page, name: string): Promise<Locator> {
  await page.keyboard.press("Escape");
  const trigger = page.getByRole("menuitem", { name });
  await expect(trigger).not.toHaveAttribute("data-popup-open");
  await trigger.click();
  const content = page.getByRole("menu");
  await expect(content).toBeVisible();
  return content;
}

test("unknown fragments keep the language chooser visible", async ({ page }) => {
  await page.goto("/#unknown");

  await expect(page.getByRole("heading", { name: /Hengband/ })).toBeVisible();
  await expect(page.getByRole("menubar")).not.toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});

test("the selected language controls the web manifest", async ({ page }) => {
  await page.goto("/#en");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/en.webmanifest");
});

test("font size is bounded and persists across reloads", async ({ page }) => {
  await page.goto("/#en");

  let viewMenu = await openMenu(page, "View");
  const fontSize = viewMenu.getByRole("menuitem").filter({ hasText: "Font size" });
  await expect(fontSize.locator("output")).toHaveText("14");
  await fontSize.getByRole("button", { name: "+" }).click();

  await expect(page.locator("html")).toHaveCSS("font-size", "15px");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hengband.fontSize")))
    .toBe("15");

  await page.reload();
  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("font-size", "15px");

  viewMenu = await openMenu(page, "View");
  await expect(
    viewMenu.getByRole("menuitem").filter({ hasText: "Font size" }).locator("output"),
  ).toHaveText("15");

  await page.evaluate(() => localStorage.setItem("hengband.fontSize", "32"));
  await page.reload();
  viewMenu = await openMenu(page, "View");
  await expect(
    viewMenu
      .getByRole("menuitem")
      .filter({ hasText: "Font size" })
      .getByRole("button", { name: "+" }),
  ).toBeDisabled();
});

test("audio settings update and persist", async ({ page }) => {
  await page.goto("/#en");

  let audioMenu = await openMenu(page, "Audio");
  const musicToggle = audioMenu.getByRole("menuitemcheckbox", { name: "Music" });
  await expect(musicToggle).toHaveAttribute("aria-checked", "true");
  await musicToggle.click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hengband.music")))
    .toBe("false");

  audioMenu = await openMenu(page, "Audio");
  const effectsToggle = audioMenu.getByRole("menuitemcheckbox", { name: "Effects" });
  await expect(effectsToggle).toHaveAttribute("aria-checked", "true");
  await effectsToggle.click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hengband.sound")))
    .toBe("false");

  audioMenu = await openMenu(page, "Audio");
  const musicVolume = audioMenu.getByRole("menuitem").filter({ hasText: "Music" });
  const effectsVolume = audioMenu.getByRole("menuitem").filter({ hasText: "Effects" });
  await expect(musicVolume.locator("output")).toHaveText("5");
  await expect(effectsVolume.locator("output")).toHaveText("5");
  await musicVolume.getByRole("button", { name: "+" }).click();
  await effectsVolume.getByRole("button", { name: "+" }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hengband.musicVolume")))
    .toBe("6");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hengband.effectsVolume")))
    .toBe("6");

  await page.reload();
  audioMenu = await openMenu(page, "Audio");
  await expect(audioMenu.getByRole("menuitemcheckbox", { name: "Music" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(audioMenu.getByRole("menuitemcheckbox", { name: "Effects" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(
    audioMenu.getByRole("menuitem").filter({ hasText: "Music" }).locator("output"),
  ).toHaveText("6");
  await expect(
    audioMenu.getByRole("menuitem").filter({ hasText: "Effects" }).locator("output"),
  ).toHaveText("6");
});

test("the game creates and initializes its terminal", async ({ page }) => {
  await page.goto("/#en");

  const terminal = page.getByTestId("terminal").locator(".xterm");
  await expect(terminal).toBeVisible({ timeout: 30_000 });
  const helpMenu = await openMenu(page, "Help");
  await expect(helpMenu.getByRole("menuitem", { name: "Online help" })).not.toHaveAttribute(
    "data-disabled",
    { timeout: 30_000 },
  );
});

test("changing language after launch reloads the game", async ({ page }) => {
  await page.addInitScript(() => {
    const count = Number(sessionStorage.getItem("test.navigationCount") ?? "0");
    sessionStorage.setItem("test.navigationCount", String(count + 1));
  });
  await page.goto("/#en");
  await expect(page.getByRole("menubar")).toContainText("Hengband");

  const navigationCountBefore = await page.evaluate(() =>
    Number(sessionStorage.getItem("test.navigationCount")),
  );
  await page.evaluate(() => {
    location.hash = "ja";
  });

  await expect(page).toHaveURL(/#ja$/);
  await expect(page.getByRole("menubar")).toContainText("変愚蛮怒");
  await expect
    .poll(() => page.evaluate(() => Number(sessionStorage.getItem("test.navigationCount"))))
    .toBe(navigationCountBefore + 1);
});
