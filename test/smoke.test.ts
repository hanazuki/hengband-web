import { expect, test } from "@playwright/test";

test("start screen", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Hengband/);

  const title = page.locator("h1");
  await expect(title).toContainText("変愚蛮怒");
  await expect(title).toContainText("Hengband");

  await expect(page.getByRole("link", { name: "日本語" })).toBeVisible();
  await expect(page.getByRole("link", { name: "English" })).toBeVisible();
});

test("clicking 日本語 loads the Japanese variant", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "日本語" }).click();

  await expect(page).toHaveURL(/#ja$/);

  const menubar = page.getByRole("menubar");
  await expect(menubar).toBeVisible();
  await expect(menubar).toContainText("変愚蛮怒");
  await expect(page.getByRole("menuitem", { name: "ゲーム" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "表示" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "ヘルプ" })).toBeVisible();

  await expect(async () => {
    await page.keyboard.press("Escape");
    await page.getByRole("menuitem", { name: "ヘルプ" }).click();
    await expect(page.getByRole("menuitem", { name: "オンライン・ヘルプ" })).not.toHaveAttribute(
      "data-disabled",
    );
  }).toPass({ timeout: 30_000 });
});

test("clicking English loads the English variant", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "English" }).click();

  await expect(page).toHaveURL(/#en$/);

  const menubar = page.getByRole("menubar");
  await expect(menubar).toBeVisible();
  await expect(menubar).toContainText("Hengband");
  await expect(page.getByRole("menuitem", { name: "Game" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "View" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Help" })).toBeVisible();

  await expect(async () => {
    await page.keyboard.press("Escape");
    await page.getByRole("menuitem", { name: "Help" }).click();
    await expect(page.getByRole("menuitem", { name: "Online help" })).not.toHaveAttribute(
      "data-disabled",
    );
  }).toPass({ timeout: 30_000 });
});
