<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { draculaTheme } from "./dracula";
import Hengband from "./Hengband.svelte";
import Menu from "./Menu.svelte";
import StartScreen from "./StartScreen.svelte";

document.documentElement.style.setProperty("--fg-color", draculaTheme.foreground ?? null);
document.documentElement.style.setProperty("--bg-color", draculaTheme.background ?? null);

type Variant = "ja" | "en";

function parseFragment(hash: string): Variant | null {
  if (hash === "#ja") return "ja";
  if (hash === "#en") return "en";
  return null;
}

let variant = $state<Variant | null>(parseFragment(location.hash));
let fontSize = $state(Number(localStorage.getItem("hengband.fontSize")) || 14);

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

$effect(() => {
  document.documentElement.style.fontSize = `${fontSize}px`;
});

onMount(() => {
  window.addEventListener("hashchange", handleNavigation);
  window.addEventListener("popstate", handleNavigation);
});

onDestroy(() => {
  window.removeEventListener("hashchange", handleNavigation);
  window.removeEventListener("popstate", handleNavigation);
});
</script>

<div class="app">
  {#if variant === null}
    <StartScreen />
  {:else}
    <Menu {variant} {fontSize} onFontSizeChange={handleFontSizeChange} />
    <Hengband {variant} {fontSize} />
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
