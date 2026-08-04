// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { expect, test } from "@playwright/test";

test("the selected language controls the web manifest", async ({ page }) => {
  await page.goto("/#en");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/en.webmanifest");
});

test("the production build exposes PWA artifacts", async ({ request }) => {
  const manifest = await request.get("/en.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  expect((await manifest.json()).lang).toBe("en");

  const serviceWorker = await request.get("/sw.js");
  expect(serviceWorker.ok()).toBe(true);
  const serviceWorkerSource = await serviceWorker.text();
  expect(serviceWorkerSource).toContain('"url":"en.webmanifest"');
  expect(serviceWorkerSource).toContain("SKIP_WAITING");
});
