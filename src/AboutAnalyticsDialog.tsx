// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { Dialog } from "@base-ui/react/dialog";
import { useRef } from "react";
import styles from "./Dialog.module.css";
import type { Variant } from "./Menu";

export interface AboutAnalyticsDialogProps {
  variant: Variant;
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function AboutAnalyticsDialog({ variant, open, onOpenChange }: AboutAnalyticsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Viewport className={styles.viewport}>
          <Dialog.Popup className={styles.popup} initialFocus={closeRef}>
            <Dialog.Title className={styles.title}>
              {variant === "ja" ? "アクセス解析について" : "About Analytics"}
            </Dialog.Title>
            <Dialog.Description className={styles.description} render={<div />}>
              <p>
                {variant === "ja"
                  ? "このゲームはソフトウェアの改善を目的として、プレイ環境に関する匿名のデータを収集しています。収集されたデータは統計として扱われ、個人を特定しうる情報が保存されることはありません。"
                  : "To help improve the software, this game collects anonymous data about the environment in which it is played. The collected data is used only in aggregate, and no information that could identify you is stored."}
              </p>
              <p>
                {variant === "ja"
                  ? "ゲームをプレイすると、デバイス、ブラウザ、パフォーマンスに関する情報を含むビーコンがCloudflareに送信されます。ゲームの進行状況などゲームプレイに関する情報は送信されません。"
                  : "When you play the game, a beacon containing device, browser, and performance information is sent to Cloudflare. No information about gameplay, such as game progress, is sent."}
              </p>
            </Dialog.Description>
            <div className={styles.actions}>
              <Dialog.Close className={styles.button} ref={closeRef}>
                {variant === "ja" ? "閉じる" : "Close"}
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
