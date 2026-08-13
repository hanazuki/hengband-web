// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import type { Plugin } from "vite";

const BEACON_URL = "https://static.cloudflareinsights.com/beacon.min.js";

export function cloudflareWebAnalytics(token: string | undefined): Plugin {
  const normalizedToken = token?.trim();

  return {
    name: "cloudflare-web-analytics",
    apply: "build",
    transformIndexHtml() {
      if (!normalizedToken) return [];

      return [
        {
          tag: "script",
          attrs: {
            type: "module",
            src: BEACON_URL,
            "data-cf-beacon": JSON.stringify({ token: normalizedToken }),
          },
          injectTo: "head",
        },
      ];
    },
  };
}
