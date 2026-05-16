/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { clientsClaim } from "workbox-core";
import { PrecacheController, PrecacheRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

self.skipWaiting();
clientsClaim();

const precacheController = new PrecacheController({});
precacheController.precache(self.__WB_MANIFEST);
const precacheRoute = new PrecacheRoute(precacheController);
registerRoute(precacheRoute);
