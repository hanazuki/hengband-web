// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { describe, expect, test } from "vitest";
import { cloudflareWebAnalytics } from "./cloudflare-web-analytics";

function transform(token: string | undefined) {
  const hook = cloudflareWebAnalytics(token).transformIndexHtml;
  if (typeof hook !== "function") throw new Error("transformIndexHtml hook is missing");
  return hook.call({} as never, "", {} as never) as unknown;
}

describe("cloudflareWebAnalytics", () => {
  test.each([undefined, "", "   "])("does not inject a beacon without a token", (token) => {
    expect(transform(token)).toEqual([]);
  });

  test("injects the Cloudflare beacon into the document head", () => {
    expect(transform("site-token")).toEqual([
      {
        tag: "script",
        attrs: {
          type: "module",
          src: "https://static.cloudflareinsights.com/beacon.min.js",
          "data-cf-beacon": '{"token":"site-token"}',
        },
        injectTo: "head",
      },
    ]);
  });
});
