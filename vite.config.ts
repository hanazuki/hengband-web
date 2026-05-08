import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Jsonnet } from "@hanazuki/node-jsonnet";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import license from "rollup-plugin-license";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const VARIANTS = ["ja", "en"] as const;
type Variant = (typeof VARIANTS)[number];

function webmanifestPlugin(variants: readonly Variant[]): Plugin {
  const sourceFile = path.resolve("webmanifest.jsonnet");

  async function generate(variant: Variant): Promise<string> {
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
            const content = await generate(match[1] as "ja" | "en");
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
 * Emits versioned Emscripten build artifacts (hengband-{hash}.{js,wasm,data}) into the
 * Rollup bundle so VitePWA includes them in the precache manifest. In dev mode, serves the
 * files from wasm/ while accepting the suffixed URLs the app requests.
 *
 * Using filename-based hashing (rather than query parameters) ensures that a non-atomic
 * deployment cannot serve a mismatched set of files: the old JS always requests the old
 * wasm/data by name, and both versions can coexist on the server during the rollover.
 */
function wasmVersionedPlugin(): Plugin {
  const wasmDir = path.resolve("wasm");
  const buildIds: Partial<Record<Variant, string>> = {};

  return {
    name: "wasm-versioned",
    config(_, { command }) {
      const define: Record<string, string> = {};
      for (const variant of VARIANTS) {
        if (command === "build") {
          const wasmFile = path.join(wasmDir, variant, "hengband.wasm");
          buildIds[variant] = crypto
            .createHash("sha256")
            .update(fs.readFileSync(wasmFile))
            .digest("hex")
            .slice(0, 8);
        }
        define[`import.meta.env.VITE_WASM_BUILD_ID_${variant.toUpperCase()}`] = JSON.stringify(
          buildIds[variant] ?? "",
        );
      }
      return { define };
    },
    generateBundle() {
      for (const variant of VARIANTS) {
        const buildId = buildIds[variant];
        if (!buildId) continue;
        for (const ext of ["js", "wasm", "data"]) {
          const src = path.join(wasmDir, variant, `hengband.${ext}`);
          this.emitFile({
            type: "asset",
            fileName: `assets/${variant}/hengband-${buildId}.${ext}`,
            source: fs.readFileSync(src),
          });
        }
      }
    },
    configureServer(server) {
      const contentTypes: Record<string, string> = {
        js: "text/javascript; charset=utf-8",
        wasm: "application/wasm",
        data: "application/octet-stream",
      };
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        const match = /^\/assets\/(en|ja)\/hengband\.(js|wasm|data)$/.exec(url);
        if (!match) return next();
        const filePath = path.join(wasmDir, match[1], `hengband.${match[2]}`);
        if (!fs.existsSync(filePath)) return next();
        res.setHeader("Content-Type", contentTypes[match[2]]);
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(filePath).on("error", next).pipe(res);
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
        globPatterns: ["**/*.{js,wasm,css,html,data}"],
      },
      manifest: false,
    }),
    webmanifestPlugin(VARIANTS),
    wasmVersionedPlugin(),
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
