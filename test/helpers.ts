// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { expect, type Locator, type Page } from "@playwright/test";

export async function openMenu(page: Page, name: string): Promise<Locator> {
  await page.keyboard.press("Escape");
  const trigger = page.getByRole("menuitem", { name });
  await expect(trigger).not.toHaveAttribute("data-popup-open");
  await trigger.dispatchEvent("click");
  const content = page.getByRole("menu");
  await expect(content).toBeVisible();
  return content;
}
