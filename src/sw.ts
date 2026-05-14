/// <reference lib="webworker" />
import type { WorkboxPlugin } from "workbox-core";
import { clientsClaim } from "workbox-core";
import { PrecacheController, PrecacheRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

const isolationPlugin: WorkboxPlugin = {
  handlerWillRespond: async ({ request, response }) => {
    const headers = new Headers(response.headers);
    if (request.mode === "navigate") {
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

const precacheController = new PrecacheController({ plugins: [isolationPlugin] });
precacheController.precache(self.__WB_MANIFEST);
const precacheRoute = new PrecacheRoute(precacheController);
registerRoute(precacheRoute);
