<!-- SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband -->
<script lang="ts">
import { AlertDialog } from "bits-ui";

let {
  variant,
  open = $bindable(),
  onConfirm,
}: {
  variant: "ja" | "en";
  open: boolean;
  onConfirm: () => void;
} = $props();

let cancelRef = $state<HTMLButtonElement | null>(null);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        cancelRef?.focus();
      }}
    >
      <AlertDialog.Title>{variant === "ja" ? "アップデート" : "Update"}</AlertDialog.Title>
      <AlertDialog.Description>
        <p>{variant === "ja"
          ? "アプリの新しいバージョンが利用可能です。"
          : "A new version of the app is available."
        }</p>
        <p>{variant === "ja"
          ? "適用するとプレイ中のゲームは中断され、保存していない進行状況は失われます。"
          : "Applying it will interrupt the game in progress, and any unsaved progress will be lost."
        }</p>
        <p>{variant === "ja"
          ? "また、既存のセーブデータは新しいバージョンと互換性がない場合があります。次に新しいゲームを始めるときに適用することをおすすめします。"
          : "Existing save data may also be incompatible with the new version. We recommend applying the update when you start a new game."
        }</p>
      </AlertDialog.Description>
      <div class="update-dialog-actions">
        <a class="changelog" href="https://github.com/hanazuki/hengband-web/blob/master/CHANGELOG.md" target="_blank"
          >{variant === "ja" ? "変更履歴を見る" : "View the changelog"}</a
        >
        <AlertDialog.Cancel bind:ref={cancelRef}>{variant === "ja" ? "キャンセル" : "Cancel"}</AlertDialog.Cancel>
        <AlertDialog.Action onclick={onConfirm}>{variant === "ja" ? "アップデート" : "Update"}</AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>

<style>
  :global([data-alert-dialog-overlay]) {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 50%);
    z-index: 20;
  }

  :global([data-alert-dialog-content]) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: min(60ch, 90vw);
    padding: 0.5lh 0.5ch;

    color: var(--fg-color);
    background: var(--bg-color);
    font-family: monospace;
    font-size: 1rem;

    z-index: 30;

    border-width: 1lh 1ch;
    border-style: solid;
    border-image-source: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><text x="0" y="10" font-family="monospace" font-size="1rem" fill="white">┌─┐</text><text x="0" y="20" font-family="monospace" font-size="1rem" fill="white">│ │</text><text x="0" y="30" font-family="monospace" font-size="1rem" fill="white">└─┘</text></svg>');
    border-image-slice: 10;
    border-image-repeat: repeat;
  }

  :global([data-alert-dialog-title]) {
    display: block;
    margin-bottom: 1lh;
    font: inherit;
    font-weight: bold;
  }

  :global([data-alert-dialog-description]) p {
    margin-bottom: 1lh;
  }

  .update-dialog-actions {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 1ch;
  }

  .changelog {
    margin-right: auto;
    color: inherit;
    cursor: pointer;
  }

  :global([data-alert-dialog-cancel]),
  :global([data-alert-dialog-action]) {
    &::before { content: "[ "; }
    &::after { content: " ]"; }

    appearance: none;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
</style>
