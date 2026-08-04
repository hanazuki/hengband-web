// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband

import { registerSW } from "virtual:pwa-register";
import { useSyncExternalStore } from "react";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
let updateAvailable = false;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registered = false;
let applyingUpdate = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot(): boolean {
  return updateAvailable;
}
function emitChange(): void {
  for (const listener of listeners) listener();
}

export function usePwaUpdateAvailable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
      emitChange();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL);
    },
  });
}

export async function applyPwaUpdate(): Promise<void> {
  applyingUpdate = true;
  setTimeout(() => {
    applyingUpdate = false;
  }, 10000);
  await updateServiceWorker?.(true);
}
