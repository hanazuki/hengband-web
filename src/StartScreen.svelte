<script lang="ts">
const { onSelect }: { onSelect: (variant: "ja" | "en") => void } = $props();
</script>

<div class="start-screen">
  <h1 class="title"><span lang="ja">変愚蛮怒</span> / <span lang="en">Hengband</span></h1>
  <div class="instruction">
    <span lang="ja">言語を選択してください。</span>
    <span lang="en">Choose your language.</span>
  </div>
  <div class="lang-chooser">
    <button lang="ja" class="lang-button" onclick={() => onSelect("ja")}>[ 日本語 ]</button>
    <button lang="en" class="lang-button" onclick={() => onSelect("en")}>[ English ]</button>
  </div>
</div>

<style>
  .start-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 2rem;
  }

  .title {
    font-size: 2rem;
    color: #e0e0e0;
    font-weight: normal;
  }

  .lang-chooser {
    display: flex;
    gap: 1.5rem;
  }

  .lang-button {
    padding-block: 0.75rem;
    font-family: inherit;
    font-size: 1.25rem;
    background: transparent;
    color: #e0e0e0;
    border: none;
    cursor: pointer;
    width: 8em;
  }

  .lang-button:hover {
    background: #3a3a3a;
    border-color: #888;
  }

  .lang-button:active {
    background: #444;
  }
</style>
