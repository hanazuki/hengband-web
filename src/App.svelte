<script lang="ts">
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { onDestroy, onMount } from "svelte";
import "@xterm/xterm/css/xterm.css";
import type { HengbandFactory } from "./hengband";

let termContainer: HTMLDivElement;
let errorMessage = $state<string | null>(null);

let term: Terminal | null = null;
let observer: ResizeObserver | null = null;

onDestroy(() => {
  observer?.disconnect();
  term?.dispose();
});

onMount(async () => {
  // Wait for the browser to compute flex layout so xterm.js can measure
  // character cell dimensions when open() is called. Without this,
  // proposeDimensions() always gets cell.width/height = 0 and fit() is a no-op.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  term = new Terminal({ scrollback: 1000 });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(termContainer);
  fitAddon.fit();

  try {
    const wasmModuleUrl: string = "/en/hengband.js";
    const { default: createModule } = (await import(/* @vite-ignore */ wasmModuleUrl)) as {
      default: HengbandFactory;
    };

    const decoder = new TextDecoder();
    const mod = await createModule({
      locateFile: (path) => `/en/${path}`,
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

    Promise.resolve(mod.callMain([])).catch((e: unknown) => {
      errorMessage = String(e);
    });
  } catch (e) {
    errorMessage = String(e);
    term.dispose();
    term = null;
  }
});
</script>

<div class="app">
  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}
  <div bind:this={termContainer} class="terminal"></div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: monospace;
    height: 100vh;
    overflow: hidden;
  }

  .app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

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
