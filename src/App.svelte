<!-- SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband -->
<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { draculaTheme } from "./dracula";
import Menu from "./Menu.svelte";
import { applyPwaUpdate, pwaUpdateAvailable } from "./pwa.svelte";
import StartScreen from "./StartScreen.svelte";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const hengbandModule = import("./Hengband.svelte");

document.documentElement.style.setProperty("--fg-color", draculaTheme.foreground ?? null);
document.documentElement.style.setProperty("--bg-color", draculaTheme.background ?? null);
document.documentElement.style.setProperty("--bright-black", draculaTheme.brightBlack ?? null);

type Variant = "ja" | "en";

function parseFragment(hash: string): Variant | null {
  if (hash === "#ja") return "ja";
  if (hash === "#en") return "en";
  return null;
}

let variant = $state<Variant | null>(parseFragment(location.hash));
let fontSize = $state(Number(localStorage.getItem("hengband.fontSize")) || 14);
let soundEnabled = $state(localStorage.getItem("hengband.sound") !== "false");
let musicEnabled = $state(localStorage.getItem("hengband.music") !== "false");
let musicVolume = $state(Number(localStorage.getItem("hengband.musicVolume") ?? "5"));
let effectsVolume = $state(Number(localStorage.getItem("hengband.effectsVolume") ?? "5"));
let deferredInstallPrompt = $state<BeforeInstallPromptEvent | null>(null);
let openOnlineHelp = $state<(() => void) | null>(null);
const updateAvailable = $derived(pwaUpdateAvailable());

function handleFontSizeChange(size: number): void {
  const clamped = Math.max(8, Math.min(32, size));
  fontSize = clamped;
  localStorage.setItem("hengband.fontSize", String(clamped));
}

function handleSoundEnabledChange(enabled: boolean): void {
  soundEnabled = enabled;
  localStorage.setItem("hengband.sound", String(enabled));
}

function handleMusicEnabledChange(enabled: boolean): void {
  musicEnabled = enabled;
  localStorage.setItem("hengband.music", String(enabled));
}

function handleMusicVolumeChange(volume: number): void {
  musicVolume = volume;
  localStorage.setItem("hengband.musicVolume", String(volume));
}

function handleEffectsVolumeChange(volume: number): void {
  effectsVolume = volume;
  localStorage.setItem("hengband.effectsVolume", String(volume));
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

async function handleUpdate(): Promise<void> {
  const message =
    variant === "ja"
      ? "新しいバージョンを適用するため、アプリを再読み込みします。\n\n" +
        "保存していないゲームの進行状況は失われます。\n\n" +
        "また、既存のセーブデータが新しいバージョンと互換でない場合があります。次に新しいゲームを始めるときまでアップデートを見送ることをおすすめします。\n\n" +
        "続行しますか？"
      : "The app will reload to apply a new version.\n\n" +
        "Any unsaved game progress will be lost.\n\n" +
        "Also, existing save data may not be compatible with the new version. You are advised to defer the update until you start a new game.\n\n" +
        "Continue?";
  if (window.confirm(message)) {
    await applyPwaUpdate();
  }
}

$effect(() => {
  document.documentElement.style.fontSize = `${fontSize}px`;
});

onMount(() => {
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
  {#if variant === null}
    <StartScreen />
  {:else}
    <Menu {variant} {fontSize} {soundEnabled} {musicEnabled} {musicVolume} {effectsVolume} onFontSizeChange={handleFontSizeChange} onSoundEnabledChange={handleSoundEnabledChange} onMusicEnabledChange={handleMusicEnabledChange} onMusicVolumeChange={handleMusicVolumeChange} onEffectsVolumeChange={handleEffectsVolumeChange} onInstall={deferredInstallPrompt ? handleInstall : undefined} onUpdate={updateAvailable ? handleUpdate : undefined} onOnlineHelp={openOnlineHelp ?? undefined} />
    {#await hengbandModule then { default: Hengband}}
      <Hengband {variant} {fontSize} {soundEnabled} {musicEnabled} {musicVolume} {effectsVolume} onReady={({ openOnlineHelp: fn }) => { openOnlineHelp = fn; }} onExited={() => { openOnlineHelp = null; }} />
    {/await}
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
</style>
