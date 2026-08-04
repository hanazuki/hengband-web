// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { expect, test } from "@playwright/test";

test("the start screen offers both game variants", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Hengband/);
  const title = page.locator("h1");
  await expect(title).toContainText("変愚蛮怒");
  await expect(title).toContainText("Hengband");
  await expect(page.getByRole("link", { name: "日本語" })).toBeVisible();
  await expect(page.getByRole("link", { name: "English" })).toBeVisible();
});

test("unknown fragments keep the language chooser visible", async ({ page }) => {
  await page.goto("/#unknown");

  await expect(page.getByRole("heading", { name: /Hengband/ })).toBeVisible();
  await expect(page.getByRole("menubar")).not.toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});

for (const variant of [
  {
    link: "日本語",
    hash: "ja",
    title: "変愚蛮怒",
    menus: ["ゲーム", "表示", "ヘルプ"],
  },
  { link: "English", hash: "en", title: "Hengband", menus: ["Game", "View", "Help"] },
] as const) {
  test(`selecting ${variant.link} loads its variant`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: variant.link }).click();

    await expect(page).toHaveURL(new RegExp(`#${variant.hash}$`));
    const menubar = page.getByRole("menubar");
    await expect(menubar).toBeVisible();
    await expect(menubar).toContainText(variant.title);
    for (const menu of variant.menus) {
      await expect(page.getByRole("menuitem", { name: menu })).toBeVisible();
    }
  });
}

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
