import fs from "node:fs";
import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import yaml from "js-yaml";
import type { Plugin } from "vite";
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vitest/config";

function yamlPlugin(): Plugin {
  return {
    name: "yaml",
    transform(src, id) {
      if (!id.endsWith(".yml") && !id.endsWith(".yaml")) return;
      return { code: `export default ${JSON.stringify(yaml.load(src))};`, map: null };
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
  plugins: [publicEsModulePlugin(), yamlPlugin(), wasm(), svelte()],
  server: {
    port: 5173,
  },
  build: {
    target: "esnext",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
