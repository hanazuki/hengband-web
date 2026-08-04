// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef } from "react";
import type { Variant } from "./Menu";
import styles from "./UpdateDialog.module.css";

export interface UpdateDialogProps {
  variant: Variant;
  open: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
}

export function UpdateDialog({ variant, open, onOpenChange, onConfirm }: UpdateDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Viewport className={styles.viewport}>
          <AlertDialog.Popup className={styles.popup} initialFocus={cancelRef}>
            <AlertDialog.Title className={styles.title}>
              {variant === "ja" ? "アップデート" : "Update"}
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.description}>
              <p>
                {variant === "ja"
                  ? "アプリの新しいバージョンが利用可能です。"
                  : "A new version of the app is available."}
              </p>
              <p>
                {variant === "ja"
                  ? "適用するとプレイ中のゲームは中断され、保存していない進行状況は失われます。"
                  : "Applying it will interrupt the game in progress, and any unsaved progress will be lost."}
              </p>
              <p>
                {variant === "ja"
                  ? "また、既存のセーブデータは新しいバージョンと互換性がない場合があります。次に新しいゲームを始めるときに適用することをおすすめします。"
                  : "Existing save data may also be incompatible with the new version. We recommend applying the update when you start a new game."}
              </p>
            </AlertDialog.Description>
            <div className={styles.actions}>
              <a
                className={styles.changelog}
                href="https://github.com/hanazuki/hengband-web/blob/master/CHANGELOG.md"
                rel="noopener"
                target="_blank"
              >
                {variant === "ja" ? "変更履歴を見る" : "View the changelog"}
              </a>
              <AlertDialog.Close className={styles.button} ref={cancelRef}>
                {variant === "ja" ? "キャンセル" : "Cancel"}
              </AlertDialog.Close>
              <AlertDialog.Close className={styles.button} onClick={onConfirm}>
                {variant === "ja" ? "アップデート" : "Update"}
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
