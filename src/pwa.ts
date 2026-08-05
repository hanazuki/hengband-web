// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband

import { registerSW } from "virtual:pwa-register";
import { useSyncExternalStore } from "react";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const VERSION_REQUEST_TIMEOUT = 2000;

export interface PwaUpdate {
  available: boolean;
  version: string | null;
}

let update: PwaUpdate = { available: false, version: null };
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
let registered = false;
let applyingUpdate = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot(): PwaUpdate {
  return update;
}
function emitChange(): void {
  for (const listener of listeners) listener();
}

export function usePwaUpdate(): PwaUpdate {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function pwaApplyingUpdate(): boolean {
  return applyingUpdate;
}

function getWaitingVersion(registration: ServiceWorkerRegistration): Promise<string | null> {
  const worker = registration.waiting;
  if (!worker) return Promise.resolve(null);

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => finish(null), VERSION_REQUEST_TIMEOUT);
    function finish(version: string | null): void {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(version);
    }
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      finish(
        typeof data === "object" &&
          data !== null &&
          "version" in data &&
          typeof data.version === "string"
          ? data.version
          : null,
      );
    };
    worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  });
}

async function loadUpcomingVersion(): Promise<void> {
  const registration = serviceWorkerRegistration ?? (await navigator.serviceWorker.ready);
  const version = await getWaitingVersion(registration);
  if (!update.available) return;
  update = { ...update, version };
  emitChange();
}

export function registerPwa(): void {
  if (registered) return;
  registered = true;
  updateServiceWorker = registerSW({
    onNeedRefresh() {
      update = { available: true, version: null };
      emitChange();
      void loadUpcomingVersion();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      serviceWorkerRegistration = registration;
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
