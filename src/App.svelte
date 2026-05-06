<script lang="ts">
import Hengband from "./Hengband.svelte";
</script>

<div class="app">
  <Hengband variant="en" />
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
