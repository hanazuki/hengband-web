<script lang="ts">
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { onDestroy, onMount } from "svelte";
import { FitAddon } from "./fit-addon";
import "@xterm/xterm/css/xterm.css";
import { musicMap } from "virtual:hengband-xtra/music";
import { soundMap } from "virtual:hengband-xtra/sounds";
import { SoundEngine } from "./audio";
import { draculaTheme } from "./dracula";
import type { HengbandFactory } from "./hengband";
import { HengbandUnicodeAddon } from "./hengband-unicode";

const {
  variant,
  fontSize,
  soundEnabled,
  musicEnabled,
  musicVolume,
  effectsVolume,
  onReady,
  onExited,
}: {
  variant: "ja" | "en";
  fontSize: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  onReady?: (actions: { openOnlineHelp: () => void }) => void;
  onExited?: () => void;
} = $props();

const buildId = $derived(
  (variant === "ja"
    ? import.meta.env.VITE_WASM_BUILD_ID_JA
    : import.meta.env.VITE_WASM_BUILD_ID_EN) as string,
);
const suffix = $derived(buildId ? `-${buildId}` : "");
const assetBase = $derived(`/assets/${variant}/hengband${suffix}`);

let termContainer: HTMLDivElement;
let errorMessage = $state<string | null>(null);
let exited = $state<boolean>(false);

let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let resizeTerm: (() => void) | null = null;
const engine = new SoundEngine(soundMap, musicMap);

$effect(() => {
  // Always read fontSize first so Svelte registers it as a dependency even when
  // term is null on the initial run (before onMount assigns it).
  // requestAnimationFrame defers the fit until xterm.js has updated its cell metrics.
  const size = fontSize;
  if (term == null) return;
  term.options.fontSize = size;
});

$effect(() => {
  engine.setEffectsEnabled(soundEnabled);
});

$effect(() => {
  engine.setMusicEnabled(musicEnabled);
});

$effect(() => {
  engine.setMusicVolume(musicVolume / 10);
});

$effect(() => {
  engine.setEffectsVolume(effectsVolume / 10);
});

let observer: ResizeObserver | null = null;
let beforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;

onDestroy(() => {
  observer?.disconnect();
  term?.dispose();
  engine.dispose();
  if (beforeUnload) window.removeEventListener("beforeunload", beforeUnload);
});

async function openOnlineHelp(): Promise<void> {
  term?.input("\x1b\x1b\x1b", false);
  await new Promise<void>((r) => setTimeout(r, 100)); // delay required for unknown reason
  term?.input("?", false);
}

onMount(async () => {
  term = new Terminal({ scrollback: 1000, allowProposedApi: true, theme: draculaTheme, fontSize });
  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new HengbandUnicodeAddon());
  term.loadAddon(new WebglAddon());
  term.loadAddon(new WebLinksAddon());
  term.unicode.activeVersion = "hengband";
  term.open(termContainer);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  fitAddon.fit();

  term.write(variant === "ja" ? "ゲームをダウンロードしています……" : "Downloding the game...");

  try {
    const { default: createModule } = (await import(/* @vite-ignore */ `${assetBase}.js`)) as {
      default: HengbandFactory;
    };

    const decoder = new TextDecoder();
    const mod = await createModule({
      locateFile: (p) => `${assetBase}${p.replace(/^hengband/, "")}`,
      noInitialRun: true,
      onExit: (code) => {
        if (term) {
          term.write("\x1b[H\x1b[2J");
          if (code !== 0) {
            term.write(
              variant === "ja"
                ? `ゲームが異常終了しました。(${code})`
                : `The game ended abnormally. (${code})`,
            );
            term.write("\r\n");
          }
          term.write(
            variant === "ja"
              ? "ゲームを再開するにはページを再読み込みしてください。"
              : "Reload the page to restart the game.",
          );
          term.write("\r\n");
        }
        exited = true;
        onExited?.();
      },
      _web_on_output: (bytes) => {
        const text = decoder.decode(bytes, { stream: true });
        term?.write(text);
      },
      _web_on_sound: (name) => engine.playSound(name),
      _web_on_music: (type, val) => engine.playMusic(type, val),
      _web_on_music_scene: (scene) => engine.playMusicScene(scene),
    });
    engine.preloadAll();

    let audioUnlocked = false;
    term.onData((data) => {
      if (!audioUnlocked) {
        audioUnlocked = true;
        engine.enableAudio();
      }
      const bytes = new TextEncoder().encode(data);
      for (const b of bytes) {
        mod._web_push_key(b);
      }
    });

    resizeTerm = () => {
      fitAddon?.fit();
      if (term) mod._web_resize_term(term.cols, term.rows);
    };

    observer = new ResizeObserver(resizeTerm);
    observer.observe(termContainer);

    // ANGBAND_DIR_SAVE=/lib/save, ANGBAND_DIR_USER=/lib/user, ANGBAND_DIR_BONE=/lib/bone.
    // These directories contain only excluded files (delete.me, Makefiles) so Emscripten's
    // preloader never creates them in the VFS. We create them here and mount IDBFS on the
    // ones that need persistence (save and user); bone stays as volatile MEMFS.
    const idbfs = mod.FS.filesystems.IDBFS;
    const mkdirOk = (path: string) => {
      try {
        mod.FS.mkdir(path);
      } catch (e) {
        if ((e as { errno?: number }).errno !== 20) throw e;
      }
    };
    mkdirOk("/lib/save");
    mkdirOk("/lib/user");
    mkdirOk("/lib/bone");
    // /lib/apex already exists (h_scores.raw preloaded), but that file is just a
    // placeholder; the game recreates it via fd_make if missing after the IDBFS overlay.
    if (idbfs) {
      mod.FS.mount(idbfs, { autoPersist: true }, "/lib/save");
      mod.FS.mount(idbfs, { autoPersist: true }, "/lib/user");
      mod.FS.mount(idbfs, { autoPersist: true }, "/lib/apex");
      mod.FS.mount(idbfs, { autoPersist: true }, "/lib/bone");
      await new Promise<void>((resolve) => {
        mod.FS.syncfs(true, (err) => {
          if (err) console.error("IDBFS initial sync failed:", err);
          resolve();
        });
      });
    } else {
      console.warn("IDBFS not available in this build; game saves will not persist");
    }

    beforeUnload = (e) => {
      if (!exited) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);

    Promise.resolve(mod.callMain([])).catch((e: unknown) => {
      errorMessage = String(e);
    });
    onReady?.({ openOnlineHelp });
  } catch (e) {
    errorMessage = String(e);
    term.dispose();
    term = null;
    throw e;
  }
});
</script>

<svelte:head>
  <link rel="modulepreload" href="{assetBase}.js" />
  <link rel="preload" as="fetch" crossorigin="anonymous" href="{assetBase}.wasm" />
  <link rel="preload" as="fetch" crossorigin="anonymous" href="{assetBase}.data" />
</svelte:head>

{#if errorMessage}
  <div class="error">{errorMessage}</div>
{/if}
<div bind:this={termContainer} class="terminal"></div>

<style>
  .terminal {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .error {
    background: #300;
    color: #f88;
    padding: 1rem;
    font-family: monospace;
    white-space: pre-wrap;
  }
</style>
