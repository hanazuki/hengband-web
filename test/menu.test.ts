// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { expect, test } from "@playwright/test";
import { openMenu } from "./helpers";

for (const locale of [
  { hash: "ja", help: "ヘルプ", licenses: "ライセンス表示" },
  { hash: "en", help: "Help", licenses: "Software licenses" },
] as const) {
  test(`${locale.licenses} opens licenses.txt`, async ({ page }) => {
    await page.goto(`/#${locale.hash}`);
    await expect(page.getByRole("menubar")).toBeVisible();
    await openMenu(page, locale.help);

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("menuitem", { name: locale.licenses }).click(),
    ]);

    await expect(popup).toHaveURL(/\/licenses\.txt$/);
    await expect(popup.locator("body")).toContainText("Hengband Web Port");
  });
}

test("font size is bounded and persists across reloads", async ({ page }) => {
  await page.goto("/#en");

  let viewMenu = await openMenu(page, "View");
  const fontSize = viewMenu.getByRole("menuitem").filter({ hasText: "Font size" });
  await expect(fontSize.locator("output")).toHaveText("14");
  await fontSize.getByRole("button", { name: "+" }).dispatchEvent("click");

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
  const musicVolume = audioMenu
    .getByRole("menuitem")
    .filter({ has: page.locator("output"), hasText: "Music" });
  const effectsVolume = audioMenu
    .getByRole("menuitem")
    .filter({ has: page.locator("output"), hasText: "Effects" });
  await expect(musicVolume.locator("output")).toHaveText("5");
  await expect(effectsVolume.locator("output")).toHaveText("5");
  await musicVolume.getByRole("button", { name: "+" }).dispatchEvent("click");
  await effectsVolume.getByRole("button", { name: "+" }).dispatchEvent("click");
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
    audioMenu
      .getByRole("menuitem")
      .filter({ has: page.locator("output"), hasText: "Music" })
      .locator("output"),
  ).toHaveText("6");
  await expect(
    audioMenu
      .getByRole("menuitem")
      .filter({ has: page.locator("output"), hasText: "Effects" })
      .locator("output"),
  ).toHaveText("6");
});
