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
