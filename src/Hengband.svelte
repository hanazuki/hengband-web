<script lang="ts">
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { onDestroy, onMount } from "svelte";
import { FitAddon } from "./fit-addon";
import "@xterm/xterm/css/xterm.css";
import { draculaTheme } from "./dracula";
import { RingBuffer } from "./hengband";
import { HengbandUnicodeAddon } from "./hengband-unicode";

const {
  variant,
  fontSize,
  onReady,
  onExited,
}: {
  variant: "ja" | "en";
  fontSize: number;
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

$effect(() => {
  // Always read fontSize first so Svelte registers it as a dependency even when
  // term is null on the initial run (before onMount assigns it).
  // requestAnimationFrame defers the fit until xterm.js has updated its cell metrics.
  const size = fontSize;
  if (term == null) return;
  term.options.fontSize = size;
});

let worker: Worker | null = null;
let observer: ResizeObserver | null = null;
let beforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;

onDestroy(() => {
  observer?.disconnect();
  term?.dispose();
  worker?.terminate();
  if (beforeUnload) window.removeEventListener("beforeunload", beforeUnload);
});

async function openOnlineHelp(): Promise<void> {
  term?.input("\x1b\x1b\x1b", false);
  await new Promise<void>((r) => setTimeout(r, 100)); // delay required for unknown reason
  term?.input("?", false);
}

onMount(async () => {
  if (!crossOriginIsolated) {
    if (typeof crossOriginIsolated === "undefined") {
      // Browser predates cross-origin isolation entirely — no SW will help.
      errorMessage = "Your browser does not support SharedArrayBuffer.";
    } else {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        // SW is active but still failed to provide isolation — SW bug, don't loop.
        errorMessage = "Cross-origin isolation could not be established.";
      } else {
        // SW not yet active (first visit) — reload to activate it.
        location.reload();
      }
    }
    return;
  }

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

  const ring = new RingBuffer();

  term.write(variant === "ja" ? "ゲームをダウンロードしています……" : "Downloading the game...");
  worker = new Worker(new URL("./hengband-worker.ts", import.meta.url), { type: "module" });
  worker.onerror = (e) => {
    errorMessage = e.message;
  };

  const decoder = new TextDecoder();
  worker.onmessage = (e) => {
    if (e.data.type === "output") {
      const text = decoder.decode(e.data.data, { stream: true });
      term?.write(text);
    } else if (e.data.type === "ready") {
      beforeUnload = (e) => {
        if (!exited) {
          e.preventDefault();
        }
      };
      window.addEventListener("beforeunload", beforeUnload);

      onReady?.({ openOnlineHelp });
    } else if (e.data.type === "exit") {
      const code: number = e.data.code;
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
      if (beforeUnload) window.removeEventListener("beforeunload", beforeUnload);
      beforeUnload = null;
      exited = true;
      onExited?.();
    } else if (e.data.type === "error") {
      errorMessage = e.data.message;
    }
  };

  term.onData((data) => {
    const bytes = new TextEncoder().encode(data);
    for (const b of bytes) {
      ring.pushKey(b);
    }
  });

  resizeTerm = () => {
    fitAddon?.fit();
    if (term) ring.pushResize(term.cols, term.rows);
  };

  observer = new ResizeObserver(resizeTerm);
  observer.observe(termContainer);

  worker.postMessage({ type: "init", assetBase, buffer: ring.buffer });
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
