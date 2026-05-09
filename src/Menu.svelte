<script lang="ts">
import { Menubar } from "bits-ui";

const {
  variant,
  fontSize,
  onFontSizeChange,
  onInstall,
  onOnlineHelp,
}: {
  variant: "ja" | "en";
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onInstall?: () => void;
  onOnlineHelp?: () => void;
} = $props();

async function handleFeedbackClick(e: MouseEvent) {
  e.preventDefault();
  const anchor = e.currentTarget as HTMLAnchorElement;

  const lines = [];
  lines.push(`- revision: ${import.meta.env.VITE_GIT_REVISION}`);
  const wasmBuildId =
    variant === "ja"
      ? import.meta.env.VITE_WASM_BUILD_ID_JA
      : import.meta.env.VITE_WASM_BUILD_ID_EN;
  lines.push(`- variant: ${variant} (\`${wasmBuildId}\`)`);

  let highEntropySucceeded = false;
  if (navigator.userAgentData) {
    try {
      const ua = await navigator.userAgentData.getHighEntropyValues([
        "architecture",
        "fullVersionList",
        "model",
        "platform",
        "platformVersion",
      ]);
      const brands = (ua.fullVersionList ?? [])
        .filter((b) => b.brand !== "Not)A;Brand")
        .map((b) => `${b.brand}/${b.version}`)
        .join(", ");
      if (brands) lines.push(`- browser: ${brands}`);
      const platformInfo = [ua.platform, ua.platformVersion, ua.architecture]
        .filter(Boolean)
        .join(" ");
      if (platformInfo) lines.push(`- platform: ${platformInfo}`);
      if (ua.model) lines.push(`- model: ${ua.model}`);
      highEntropySucceeded = true;
    } catch {
      // fall through to userAgent fallback
    }
  }
  if (!highEntropySucceeded) {
    lines.push(`- userAgent: ${navigator.userAgent}`);
  }

  lines.push(`- client size: ${window.innerWidth}x${window.innerHeight}`);
  lines.push(`- pixel density: ${window.devicePixelRatio}`);
  lines.push(`- font size: ${fontSize}`);
  lines.push(`- standalone: ${window.matchMedia("(display-mode: standalone)").matches}`);

  try {
    const { usage, quota, usageDetails } = await navigator.storage.estimate();
    const quotaStr = quota != null ? ` / ${quota}` : "";
    if (usageDetails) {
      const details = Object.entries(usageDetails)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`- storage: ${details}${quotaStr}`);
    } else if (usage != null) {
      lines.push(`- storage: ${usage}${quotaStr}`);
    }
  } catch {
    // storage estimate unavailable
  }

  const body = lines.join("\n");
  anchor.href = `https://github.com/hanazuki/hengband-web/issues/new?title=Feedback:%20&body=${encodeURIComponent(body)}`;
  window.open(anchor.href, "_blank");
}
</script>

<nav id="menu"
  ><Menubar.Root
    >{variant === "ja" ? "変愚蛮怒" : "Hengband"}<Menubar.Menu
      ><Menubar.Trigger
        >{variant === "ja" ? "ゲーム" : "Game"
      }</Menubar.Trigger
      >{#if onInstall}<Menubar.Portal
          ><Menubar.Content class="submenu"
            ><Menubar.Item onclick={onInstall}
              >{variant === "ja" ? "アプリをインストール…" : "Install app…"
            }</Menubar.Item
          ></Menubar.Content
        ></Menubar.Portal
      >{/if}</Menubar.Menu
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
          ><Menubar.Item disabled={!onOnlineHelp} onclick={onOnlineHelp}
            >{variant === "ja" ? "オンライン・ヘルプ" : "Online help"
          }</Menubar.Item
          ><Menubar.Separator
          /><Menubar.Item
            ><a href="https://github.com/hanazuki/hengband-web/issues/new" onclick={handleFeedbackClick} target="_blank"
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

  :global([data-menubar-item][data-disabled]) {
    color: var(--bright-black);
    cursor: default;
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
