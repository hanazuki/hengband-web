// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { registerSW } from "virtual:pwa-register";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

let updateAvailable = $state(false);
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registered = false;

// Plain (non-reactive) flag: only read from a DOM event handler, not from markup.
let applyingUpdate = false;

export function pwaUpdateAvailable(): boolean {
  return updateAvailable;
}

export function pwaApplyingUpdate(): boolean {
  return applyingUpdate;
}

export function registerPwa(): void {
  if (registered) return;
  registered = true;

  updateServiceWorker = registerSW({
    onNeedRefresh() {
      updateAvailable = true;
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Prompt mode only checks for updates at registration time, so poll
      // periodically. Failures (offline, server down) are not actionable.
      setInterval(() => {
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL);
    },
  });
}

export async function applyPwaUpdate(): Promise<void> {
  // The actual reload is triggered asynchronously by vite-plugin-pwa's register
  // code, in response to the workbox `controlling` event, so this flag must
  // outlive the awaited call below. If no reload happens (e.g. the new worker
  // never takes control), clear it after a timeout so the beforeunload guard
  // isn't disabled forever.
  applyingUpdate = true;
  setTimeout(() => {
    applyingUpdate = false;
  }, 10000);
  await updateServiceWorker?.(true);
}
