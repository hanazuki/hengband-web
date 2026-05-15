<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { draculaTheme } from "./dracula";
import Menu from "./Menu.svelte";
import StartScreen from "./StartScreen.svelte";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const hengbandModule = import("./Hengband.svelte");

document.documentElement.style.setProperty("--fg-color", draculaTheme.foreground ?? null);
document.documentElement.style.setProperty("--bg-color", draculaTheme.background ?? null);
document.documentElement.style.setProperty("--bright-black", draculaTheme.brightBlack ?? null);
document.documentElement.style.setProperty("--bright-red", draculaTheme.brightRed ?? null);

type Variant = "ja" | "en";

function parseFragment(hash: string): Variant | null {
  if (hash === "#ja") return "ja";
  if (hash === "#en") return "en";
  return null;
}

let variant = $state<Variant | null>(parseFragment(location.hash));
let fontSize = $state(Number(localStorage.getItem("hengband.fontSize")) || 14);
let deferredInstallPrompt = $state<BeforeInstallPromptEvent | null>(null);
let openOnlineHelp = $state<(() => void) | null>(null);
let error = $state<string | null>(null);
let ready = $state(false);

function handleFontSizeChange(size: number): void {
  const clamped = Math.max(8, Math.min(32, size));
  fontSize = clamped;
  localStorage.setItem("hengband.fontSize", String(clamped));
}

function handleNavigation(): void {
  const next = parseFragment(location.hash);
  if (variant === null) {
    if (next !== null) variant = next;
  } else {
    location.reload();
  }
}

function handleBeforeInstallPrompt(e: Event): void {
  e.preventDefault();
  deferredInstallPrompt = e as BeforeInstallPromptEvent;
}

function handleAppInstalled(): void {
  deferredInstallPrompt = null;
}

async function handleInstall(): Promise<void> {
  if (!deferredInstallPrompt) return;
  await deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") {
    deferredInstallPrompt = null;
  }
}

$effect(() => {
  document.documentElement.style.fontSize = `${fontSize}px`;
});

onMount(async () => {
  if (!crossOriginIsolated) {
    if (typeof crossOriginIsolated === "undefined") {
      // Browser predates cross-origin isolation entirely — no SW will help.
      error = "Your browser does not support SharedArrayBuffer.";
    } else if (sessionStorage.getItem("coi-reloaded") && navigator.serviceWorker.controller) {
      // Already reloaded once and SW is controlling the page — isolation still absent; give up.
      error = "Cross-origin isolation could not be established.";
    } else {
      // SW not yet controlling the page. Wait for it to take control
      // (clientsClaim fires controllerchange), then reload so it can inject COOP/COEP.
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        });
        if (navigator.serviceWorker.controller) resolve();
      });
      sessionStorage.setItem("coi-reloaded", "1");
      location.reload();
    }
    return;
  }
  sessionStorage.removeItem("coi-reloaded");
  ready = true;

  window.addEventListener("hashchange", handleNavigation);
  window.addEventListener("popstate", handleNavigation);
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
});

onDestroy(() => {
  window.removeEventListener("hashchange", handleNavigation);
  window.removeEventListener("popstate", handleNavigation);
  window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.removeEventListener("appinstalled", handleAppInstalled);
});
</script>

<svelte:head>
  {#if variant !== null}
    <link rel="manifest" href="/{variant}.webmanifest" type="application/manifest+json" />
  {/if}
</svelte:head>

<div class="app">
  {#if error}
    <div class="error">{error}</div>
  {:else if ready}
    {#if variant === null}
      <StartScreen />
    {:else}
      <Menu {variant} {fontSize} onFontSizeChange={handleFontSizeChange} onInstall={deferredInstallPrompt ? handleInstall : undefined} onOnlineHelp={openOnlineHelp ?? undefined} />
      {#await hengbandModule then { default: Hengband}}
        <Hengband {variant} {fontSize} onReady={({ openOnlineHelp: fn }) => { openOnlineHelp = fn; }} onExited={() => { openOnlineHelp = null; }} />
      {/await}
    {/if}
  {/if}
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: monospace;
    height: 100vh;
    overflow: hidden;
    color: var(--fg-color);
    background-color: var(--bg-color);
  }

  .app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .error {
    color: var(--bright-red);
    font-family: monospace;
    white-space: pre-wrap;
  }
</style>
