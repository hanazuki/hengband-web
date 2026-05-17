import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Jsonnet } from "@hanazuki/node-jsonnet";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { generateManifestIconsEntry } from "@vite-pwa/assets-generator/api/generate-manifest-icons-entry";
import { instructions } from "@vite-pwa/assets-generator/api/instructions";
import { minimal2023Preset } from "@vite-pwa/assets-generator/config";
import license from "rollup-plugin-license";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const assets = {
  ...minimal2023Preset,
  transparent: {
    ...minimal2023Preset.transparent,
    padding: 0.1,
  },
  maskable: {
    ...minimal2023Preset.maskable,
    padding: 0.3,
    resizeOptions: {
      background: "#282A36",
    },
  },
};

const VARIANTS = ["ja", "en"] as const;
type Variant = (typeof VARIANTS)[number];

function webmanifestPlugin(variants: readonly Variant[]): Plugin {
  const sourceFile = path.resolve("webmanifest.jsonnet");
  const iconsJsonPromise = instructions({
    imageResolver: () => fs.readFileSync(path.resolve("public/favicon.svg")),
    imageName: "favicon.svg",
    preset: assets,
    htmlLinks: { xhtml: false, includeId: false },
    basePath: "/",
    resolveSvgName: (name) => path.basename(name),
  }).then((instr) => JSON.stringify(generateManifestIconsEntry("object", instr).icons));

  async function generate(variant: Variant): Promise<string> {
    return new Jsonnet()
      .tlaString({ variant })
      .tlaCode({ icons: await iconsJsonPromise })
      .evaluateFile(sourceFile);
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
function gitRevisionPlugin(): Plugin {
  return {
    name: "git-revision",
    config() {
      let revision: string;
      try {
        revision = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
      } catch {
        revision = "unknown";
      }
      return { define: { "import.meta.env.VITE_GIT_REVISION": JSON.stringify(revision) } };
    },
  };
}

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

function xtraPlugin(): Plugin {
  const virtualSoundModuleId = "virtual:hengband-xtra/sounds";
  const resolvedVirtualSoundModuleId = `\0${virtualSoundModuleId}`;
  const soundCfgPath = path.resolve("hengband/lib/xtra/sound/sound.cfg");
  const xtraSoundDir = path.resolve("xtra/sound");

  const virtualMusicModuleId = "virtual:hengband-xtra/music";
  const resolvedVirtualMusicModuleId = `\0${virtualMusicModuleId}`;
  const musicCfgPath = path.resolve("hengband/lib/xtra/music/music.cfg");
  const xtraMusicDir = path.resolve("xtra/music");

  let command: "build" | "serve" = "serve";
  let soundMap: Record<string, string[]> = {};
  let musicMap: Record<string, string[]> = {};
  const soundFileRefMap = new Map<string, string>();
  const musicFileRefMap = new Map<string, string>();

  function parseSoundCfg(content: string): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    let inSection = false;
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "[Sound]") {
        inSection = true;
        continue;
      }
      if (trimmed.startsWith("[")) {
        inSection = false;
        continue;
      }
      if (!inSection || !trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const wavs = trimmed
        .slice(eq + 1)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (key && wavs.length > 0) {
        result[key] = wavs.map((w) => w.replace(/\.wav$/i, ".webm"));
      }
    }
    return result;
  }

  const MUSIC_SECTIONS = new Set(["Basic", "Town", "Dungeon", "Quest", "Monster"]);

  function parseMusicCfg(content: string): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    let inSection = false;
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[")) {
        const name = trimmed.slice(1, trimmed.indexOf("]"));
        inSection = MUSIC_SECTIONS.has(name);
        continue;
      }
      if (!inSection || !trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const mp3s = trimmed
        .slice(eq + 1)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (key && mp3s.length > 0) {
        result[key] = mp3s.map((f) => f.replace(/\.mp3$/i, ".webm"));
      }
    }
    return result;
  }

  return {
    name: "xtra",
    configResolved(config) {
      command = config.command;
    },
    resolveId(id) {
      if (id === virtualSoundModuleId) return resolvedVirtualSoundModuleId;
      if (id === virtualMusicModuleId) return resolvedVirtualMusicModuleId;
    },
    buildStart() {
      this.addWatchFile(soundCfgPath);
      this.addWatchFile(musicCfgPath);
      soundMap = parseSoundCfg(fs.readFileSync(soundCfgPath, "utf-8"));
      musicMap = parseMusicCfg(fs.readFileSync(musicCfgPath, "utf-8"));
      soundFileRefMap.clear();
      musicFileRefMap.clear();

      if (command === "build") {
        const uniqueSounds = new Set<string>();
        for (const files of Object.values(soundMap)) {
          for (const f of files) uniqueSounds.add(f);
        }
        for (const webm of uniqueSounds) {
          const filePath = path.join(xtraSoundDir, webm);
          if (fs.existsSync(filePath)) {
            const refId = this.emitFile({
              type: "asset",
              name: webm,
              source: fs.readFileSync(filePath),
            });
            soundFileRefMap.set(webm, refId);
          }
        }

        const uniqueMusic = new Set<string>();
        for (const files of Object.values(musicMap)) {
          for (const f of files) uniqueMusic.add(f);
        }
        for (const webm of uniqueMusic) {
          const filePath = path.join(xtraMusicDir, webm);
          if (fs.existsSync(filePath)) {
            const refId = this.emitFile({
              type: "asset",
              name: webm,
              source: fs.readFileSync(filePath),
            });
            musicFileRefMap.set(webm, refId);
          }
        }
      }
    },
    load(id) {
      if (id === resolvedVirtualSoundModuleId) {
        const entries: string[] = [];
        if (command === "serve") {
          for (const [key, files] of Object.entries(soundMap)) {
            const present = files.filter((f) => fs.existsSync(path.join(xtraSoundDir, f)));
            if (present.length > 0) {
              entries.push(
                `  ${JSON.stringify(key)}: [${present.map((f) => JSON.stringify(`/xtra/sound/${f}`)).join(", ")}]`,
              );
            }
          }
        } else {
          for (const [key, files] of Object.entries(soundMap)) {
            const refs = files.filter((f) => soundFileRefMap.has(f));
            if (refs.length > 0) {
              entries.push(
                `  ${JSON.stringify(key)}: [${refs.map((f) => `import.meta.ROLLUP_FILE_URL_${soundFileRefMap.get(f)}`).join(", ")}]`,
              );
            }
          }
        }

        return [
          "export class SoundMap {",
          "  #map;",
          "  constructor(map) { this.#map = map; }",
          "  entries() { return Object.entries(this.#map); }",
          "  pick(key) {",
          "    const arr = this.#map[key];",
          "    if (!arr || arr.length === 0) return null;",
          "    return arr[Math.floor(Math.random() * arr.length)];",
          "  }",
          "}",
          `export const soundMap = new SoundMap({\n${entries.join(",\n")}\n});`,
        ].join("\n");
      }

      if (id === resolvedVirtualMusicModuleId) {
        const entries: string[] = [];
        if (command === "serve") {
          for (const [key, files] of Object.entries(musicMap)) {
            const present = files.filter((f) => fs.existsSync(path.join(xtraMusicDir, f)));
            if (present.length > 0) {
              entries.push(
                `  ${JSON.stringify(key)}: [${present.map((f) => JSON.stringify(`/xtra/music/${f}`)).join(", ")}]`,
              );
            }
          }
        } else {
          for (const [key, files] of Object.entries(musicMap)) {
            const refs = files.filter((f) => musicFileRefMap.has(f));
            if (refs.length > 0) {
              entries.push(
                `  ${JSON.stringify(key)}: [${refs.map((f) => `import.meta.ROLLUP_FILE_URL_${musicFileRefMap.get(f)}`).join(", ")}]`,
              );
            }
          }
        }

        return [
          "export class MusicMap {",
          "  #map;",
          "  constructor(map) { this.#map = map; }",
          "  pick(key) {",
          "    const arr = this.#map[key];",
          "    if (!arr || arr.length === 0) return null;",
          "    return arr[Math.floor(Math.random() * arr.length)];",
          "  }",
          "}",
          `export const musicMap = new MusicMap({\n${entries.join(",\n")}\n});`,
        ].join("\n");
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        const sm = /^\/xtra\/sound\/([^/]+\.webm)$/.exec(url);
        if (sm) {
          const filePath = path.join(xtraSoundDir, sm[1]);
          if (!fs.existsSync(filePath)) return next();
          res.setHeader("Content-Type", "audio/webm");
          res.setHeader("Cache-Control", "no-cache");
          fs.createReadStream(filePath).on("error", next).pipe(res);
          return;
        }
        const mm = /^\/xtra\/music\/([^/]+\.webm)$/.exec(url);
        if (mm) {
          const filePath = path.join(xtraMusicDir, mm[1]);
          if (!fs.existsSync(filePath)) return next();
          res.setHeader("Content-Type", "audio/webm");
          res.setHeader("Cache-Control", "no-cache");
          fs.createReadStream(filePath).on("error", next).pipe(res);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    VitePWA({
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "inline",
      strategies: "injectManifest",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10_0000_0000,
        globPatterns: ["**/*.{js,wasm,css,html,data,webmanifest,png,svg,webm}"],
      },
      manifest: false,
      pwaAssets: {
        preset: assets,
      },
    }),
    gitRevisionPlugin(),
    webmanifestPlugin(VARIANTS),
    wasmVersionedPlugin(),
    xtraPlugin(),
    svelte(),
  ],
  server: {
    port: 5173,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@xterm/")) return "xterm";
          if (id.includes("/node_modules/")) return "vendor";
        },
      },
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
