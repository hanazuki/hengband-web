<script lang="ts">
import { onDestroy, onMount } from "svelte";
import Hengband from "./Hengband.svelte";
import Menu from "./Menu.svelte";
import StartScreen from "./StartScreen.svelte";
import { defaultThemeSlug, getTheme } from "./themes";

type Variant = "ja" | "en";

function parseFragment(hash: string): Variant | null {
  if (hash === "#ja") return "ja";
  if (hash === "#en") return "en";
  return null;
}

let variant = $state<Variant | null>(parseFragment(location.hash));
let colorTheme = $state(localStorage.getItem("hengband.colorTheme") ?? defaultThemeSlug);

function handleThemeChange(slug: string): void {
  colorTheme = slug;
  localStorage.setItem("hengband.colorTheme", slug);
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
  const theme = getTheme(colorTheme).theme;

  document.documentElement.style.setProperty("--fg-color", theme.foreground ?? null);
  document.documentElement.style.setProperty("--bg-color", theme.background ?? null);
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
    <Menu {variant} {colorTheme} onThemeChange={handleThemeChange} />
    <Hengband {variant} {colorTheme} />
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
