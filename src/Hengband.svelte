<script lang="ts">
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { onDestroy, onMount } from "svelte";
import "@xterm/xterm/css/xterm.css";
import type { HengbandFactory } from "./hengband";

const { variant }: { variant: "ja" | "en" } = $props();

let termContainer: HTMLDivElement;
let errorMessage = $state<string | null>(null);

let term: Terminal | null = null;
let observer: ResizeObserver | null = null;
let beforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;

onDestroy(() => {
  observer?.disconnect();
  term?.dispose();
  if (beforeUnload) window.removeEventListener("beforeunload", beforeUnload);
});

onMount(async () => {
  // Wait for the browser to compute flex layout so xterm.js can measure
  // character cell dimensions when open() is called. Without this,
  // proposeDimensions() always gets cell.width/height = 0 and fit() is a no-op.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  term = new Terminal({ scrollback: 1000, allowProposedApi: true });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new Unicode11Addon());
  term.loadAddon(new WebglAddon());
  term.loadAddon(new WebLinksAddon());
  term.open(termContainer);
  fitAddon.fit();
  term.unicode.activeVersion = "11";

  try {
    const wasmModuleUrl: string = `/${variant}/hengband.js`;
    const { default: createModule } = (await import(/* @vite-ignore */ wasmModuleUrl)) as {
      default: HengbandFactory;
    };

    const decoder = new TextDecoder();
    const mod = await createModule({
      locateFile: (path) => `/${variant}/${path}`,
      noInitialRun: true,
      _web_on_output: (bytes) => {
        const text = decoder.decode(bytes, { stream: true });
        term?.write(text);
      },
    });

    term.onData((data) => {
      const bytes = new TextEncoder().encode(data);
      for (const b of bytes) {
        mod._web_push_key(b);
      }
    });

    observer = new ResizeObserver(() => {
      fitAddon.fit();
      if (term) {
        mod._web_resize_term(term.cols, term.rows);
      }
    });
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
      e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);

    Promise.resolve(mod.callMain([])).catch((e: unknown) => {
      errorMessage = String(e);
    });
  } catch (e) {
    errorMessage = String(e);
    term.dispose();
    term = null;
    throw e;
  }
});
</script>

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
