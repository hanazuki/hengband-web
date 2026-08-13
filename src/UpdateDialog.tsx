// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef } from "react";
import styles from "./Dialog.module.css";
import type { Variant } from "./Menu";

export interface UpdateDialogProps {
  variant: Variant;
  currentVersion: string;
  version: string | null;
  open: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
}

export function UpdateDialog({
  variant,
  currentVersion,
  version,
  open,
  onOpenChange,
  onConfirm,
}: UpdateDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const showSaveCompatibilityWarning =
    version === null || currentVersion.split("+", 1)[0] !== version.split("+", 1)[0];

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Viewport className={styles.viewport}>
          <AlertDialog.Popup className={styles.popup} initialFocus={cancelRef}>
            <AlertDialog.Title className={styles.title}>
              {variant === "ja" ? "アップデート" : "Update"}
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.description} render={<div />}>
              <p>
                {variant === "ja"
                  ? version
                    ? `アプリの新しいバージョン(${version})が利用可能です。`
                    : "アプリの新しいバージョンが利用可能です。"
                  : version
                    ? `A new version of the app (${version}) is available.`
                    : "A new version of the app is available."}
              </p>
              <p>
                {variant === "ja"
                  ? "適用するとプレイ中のゲームは中断され、保存していない進行状況は失われます。"
                  : "Applying it will interrupt the game in progress, and any unsaved progress will be lost."}
              </p>
              {showSaveCompatibilityWarning && (
                <p>
                  {variant === "ja"
                    ? "既存のセーブデータは新しいバージョンと互換性がない場合があります。次に新しいゲームを始めるときに適用することをおすすめします。"
                    : "Existing save data may be incompatible with the new version. Consider applying the update when starting a new game."}
                </p>
              )}
            </AlertDialog.Description>
            <div className={styles.actions}>
              <a
                className={`${styles.actionsStart} ${styles.link}`}
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
