import fs from "node:fs";
import path from "node:path";
import { Jsonnet } from "@hanazuki/node-jsonnet";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import license from "rollup-plugin-license";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

function webmanifestPlugin(variants: string[]): Plugin {
  const sourceFile = path.resolve("webmanifest.jsonnet");

  async function generate(variant: string): Promise<string> {
    return new Jsonnet().tlaString("variant", variant).evaluateFile(sourceFile);
  }

  return {
    name: "webmanifest",
    buildStart() {
      this.addWatchFile(sourceFile);
    },
    async generateBundle() {
      for (const variant of variants) {
        this.emitFile({
          type: "asset",
          fileName: `${variant}.webmanifest`,
          source: await generate(variant),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/(ja|en)\.webmanifest$/.exec((req.url ?? "").split("?")[0]);
        if (match) {
          try {
            const content = await generate(match[1]);
            res.setHeader("Content-Type", "application/manifest+json");
            res.setHeader("Cache-Control", "no-cache");
            res.end(content);
          } catch (err) {
            next(err);
          }
          return;
        }
        next();
      });
    },
  };
}

/**
 * Serves Emscripten-generated JS wrappers from public/ as ES modules in dev mode.
 *
 * Vite refuses to serve files from public/ via import() during development, but the
 * Emscripten JS wrappers need to be dynamically imported. This plugin intercepts
 * requests for those files before Vite's module handler and streams them directly.
 */
function publicEsModulePlugin(): Plugin {
  let publicDir: string;
  return {
    name: "public-es-module",
    configResolved(config) {
      publicDir = config.publicDir;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (/^\/(en|ja)\/hengband\.js$/.test(url)) {
          const filePath = path.join(publicDir, url);
          if (fs.existsSync(filePath)) {
            res.setHeader("Content-Type", "text/javascript; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            const stream = fs.createReadStream(filePath);
            stream.on("error", next);
            stream.pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "inline",
      workbox: {
        maximumFileSizeToCacheInBytes: 10_0000_0000,
      },
      manifest: false,
    }),
    webmanifestPlugin(["ja", "en"]),
    publicEsModulePlugin(),
    svelte(),
  ],
  server: {
    port: 5173,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      plugins: [
        license({
          thirdParty: {
            output: {
              file: path.join("dist", "licenses.txt"),
              template(dependencies) {
                const readFile = (p: string) => fs.readFileSync(path.resolve(p), "utf-8");
                const npmParts = dependencies.map((dep) => {
                  const header = `${dep.name} ${dep.version} (${dep.license})`;
                  return dep.licenseText ? `${header}\n\n${dep.licenseText}` : header;
                });
                const parts = [
                  readFile("LICENSE.txt"),
                  readFile("hengband/lib/help/jlicense.txt"),
                  readFile("hengband/THIRD-PARTY-NOTICES.txt"),
                  ...npmParts,
                ];
                return parts.join(`\n\n${"=".repeat(40)}\n\n`);
              },
            },
          },
        }),
      ],
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
