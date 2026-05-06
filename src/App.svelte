<script lang="ts">
import { onDestroy, onMount } from "svelte";
import Hengband from "./Hengband.svelte";
import StartScreen from "./StartScreen.svelte";

type Variant = "ja" | "en";

function parseFragment(hash: string): Variant | null {
  if (hash === "#ja") return "ja";
  if (hash === "#en") return "en";
  return null;
}

let variant = $state<Variant | null>(parseFragment(location.hash));

function handleNavigation(): void {
  const next = parseFragment(location.hash);
  if (variant === null) {
    if (next !== null) variant = next;
  } else {
    location.reload();
  }
}

function startGame(lang: Variant): void {
  history.pushState(null, "", `#${lang}`);
  variant = lang;
}

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
    <StartScreen onSelect={startGame} />
  {:else}
    <Hengband {variant} />
  {/if}
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
</style>
