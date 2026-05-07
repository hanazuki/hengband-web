<script lang="ts">
const { onSelect }: { onSelect: (variant: "ja" | "en") => void } = $props();
</script>

<main class="start-screen">
  <h1 class="title"><span lang="ja">変愚蛮怒</span> @ <span lang="en">Hengband</span></h1>
  <div class="message">
    <p lang="ja">言語を選択してください。</p>
    <p lang="en">Choose your language.</p>
  </div>
  <div class="lang-chooser">
    <a href="#ja"><span lang="ja">日本語</span></a>
    <a href="#en"><span lang="en">English</span></a>
  </div>
</main>

<style>
  .start-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 2lh;
    font-size: 1rem;
    color: #e0e0e0;
  }

  .title {
    &::before, &::after {
      content: "*****************************************";
      display: block;
    }

    font-weight: normal;
    font-size: inherit;
    text-align: center;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 1lh;
  }

  .lang-chooser {
    display: flex;
    gap: 1rem;

    & a {
      &::before { content: "[ "; }
      &::after { content: " ]"; }
      display: inline-block;
      text-align: center;
      text-decoration: none;
      padding-block: 1lh;
      font-family: inherit;
      font-size: inherit;
      background: transparent;
      color: inherit;
      border: none;
      cursor: pointer;
      width: 8em;

      &:hover {
        background: #3a3a3a;
        border-color: #888;
      }
      &:active {
        background: #444;
      }
    }
  }
</style>
