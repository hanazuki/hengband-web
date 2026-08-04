// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { expect, test } from "@playwright/test";
import { openMenu } from "./helpers";

for (const variant of [
  { hash: "ja", help: "ヘルプ", onlineHelp: "オンライン・ヘルプ" },
  { hash: "en", help: "Help", onlineHelp: "Online help" },
] as const) {
  test(`${variant.hash} game creates its terminal and enables online help`, async ({ page }) => {
    await page.goto(`/#${variant.hash}`);

    await expect(page.getByTestId("terminal").locator(".xterm")).toBeVisible({ timeout: 30_000 });
    const helpMenu = await openMenu(page, variant.help);
    await expect(helpMenu.getByRole("menuitem", { name: variant.onlineHelp })).not.toHaveAttribute(
      "data-disabled",
      { timeout: 30_000 },
    );
  });
}
