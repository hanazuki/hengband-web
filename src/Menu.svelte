<script lang="ts">
import { Menubar } from "bits-ui";

const {
  variant,
  fontSize,
  onFontSizeChange,
}: {
  variant: "ja" | "en";
  fontSize: number;
  onFontSizeChange: (size: number) => void;
} = $props();

const feedbackUrl = () => {
  return `https://github.com/hanazuki/hengband-web/issues/new?title=Feedback:%20&body=variant:%20${variant}`;
};
</script>

<nav id="menu"
  ><Menubar.Root
    >{variant === "ja" ? "変愚蛮怒" : "Hengband"}<Menubar.Menu
      ><Menubar.Trigger
        >{variant === "ja" ? "ゲーム" : "Game"
      }</Menubar.Trigger
    ></Menubar.Menu
    ><Menubar.Menu
      ><Menubar.Trigger
        >{variant === "ja" ? "表示" : "View"
      }</Menubar.Trigger
      ><Menubar.Portal
        ><Menubar.Content class="submenu"
          ><Menubar.Item
            >{variant === "ja" ? "文字サイズ" : "Font size"
            }:<button class="font-size" disabled={fontSize <= 8} onclick={() => onFontSizeChange(fontSize - 1)}>-</button
            ><output>{fontSize}</output
            ><button class="font-size" disabled={fontSize >= 32} onclick={() => onFontSizeChange(fontSize + 1)}>+</button
          ></Menubar.Item
        ></Menubar.Content
      ></Menubar.Portal
    ></Menubar.Menu
    ><Menubar.Menu
      ><Menubar.Trigger
      >{variant === "ja" ? "ヘルプ" : "Help"}</Menubar.Trigger
      ><Menubar.Portal
        ><Menubar.Content class="submenu"
          ><Menubar.Item
            ><a href={feedbackUrl()} target="_blank"
              >{variant === "ja" ? "フィードバックを送信" : "Send feedback"
            }</a
          ></Menubar.Item
          ><Menubar.Item
            ><a href="https://github.com/hanazuki/hengband-web" target="_blank"
              >{variant === "ja" ? "ソースコード" : "Go to source code"
            }</a
          ></Menubar.Item
          ><Menubar.Item
            ><a href="/licenses.txt" target="_blank"
              >{variant === "ja" ? "ライセンス表示" : "Software licenses"
            }</a
          ></Menubar.Item
          ><Menubar.Separator
          /><Menubar.Item
            ><a href="https://mars.kmc.gr.jp/~dis/heng_wiki/" target="_blank"
              >{variant === "ja" ? "スポイラーを見る" : "View spoilers"
            }</a
          ></Menubar.Item
        ></Menubar.Content
      ></Menubar.Portal
    ></Menubar.Menu
  ></Menubar.Root
></nav>

<style>
  #menu {
    font-family: monospace;
    font-size: 1rem;
    border-bottom: 1px solid currentcolor;
    user-select: none;

    & :global([data-menubar-root]) {
      display: flex;
      flex-direction: row;
      gap: 1ch;
    }

    & :global([data-menubar-root]) > :global([data-menubar-trigger]) {
      &::before { content: "[ "; }
      &::after { content: " ]"; }

      appearance: none;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
  }

  :global([data-menubar-content]) {
    padding: 0.5lh 0.5ch;
    background: var(--bg-color);
    font-size: 1rem;

    z-index: 10;

    border-width: 1lh 1ch;
    border-style: solid;
    border-image-source: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><text x="0" y="10" font-family="monospace" font-size="1rem" fill="white">┌─┐</text><text x="0" y="20" font-family="monospace" font-size="1rem" fill="white">│ │</text><text x="0" y="30" font-family="monospace" font-size="1rem" fill="white">└─┘</text></svg>');
    border-image-slice: 10;
    border-image-repeat: repeat;

    & button {
      &::before { content: "["; }
      &::after { content: "]"; }
      margin-inline: 1ch;

      appearance: none;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    & a[href] {
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }
  }

  :global([data-menubar-separator]) {
    height: 1lh;
  }

  :global([data-menubar-sub-trigger]) {
    &::after {
      flex-grow: 1;
      content: " >";
      text-align: right;
    }
    display: flex;
    flex-direction: row;
  }
</style>
