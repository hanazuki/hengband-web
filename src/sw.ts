// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { clientsClaim } from "workbox-core";
import { PrecacheController, PrecacheRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

clientsClaim();

const precacheController = new PrecacheController({});
precacheController.precache(self.__WB_MANIFEST);
const precacheRoute = new PrecacheRoute(precacheController);
registerRoute(precacheRoute);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  else if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: import.meta.env.VITE_GIT_DESCRIPTION });
  }
});
