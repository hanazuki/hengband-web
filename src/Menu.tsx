// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { type MouseEvent, type ReactNode, useId } from "react";
import styles from "./Menu.module.css";
import { Stepper } from "./Stepper";

export type Variant = "ja" | "en";

export interface MenuProps {
  variant: Variant;
  fontSize: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onFontSizeChange(size: number): void;
  onSoundEnabledChange(enabled: boolean): void;
  onMusicEnabledChange(enabled: boolean): void;
  musicVolume: number;
  effectsVolume: number;
  onMusicVolumeChange(volume: number): void;
  onEffectsVolumeChange(volume: number): void;
  onInstall?(): void;
  onUpdate?(): void;
  onOnlineHelp?(): void;
  onAboutAnalytics(): void;
}

interface StepperItemProps {
  children: ReactNode;
  variant: Variant;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
}

function StepperItem({ children, variant, value, min, max, onChange }: StepperItemProps) {
  const labelId = useId();

  return (
    <BaseMenu.Item aria-labelledby={labelId} className={styles.stepperItem}>
      <span>
        <span id={labelId}>{children}</span>:
      </span>
      <Stepper
        decrementLabel={variant === "ja" ? "小さくする" : "Decrease"}
        incrementLabel={variant === "ja" ? "大きくする" : "Increase"}
        value={value}
        min={min}
        max={max}
        onChange={onChange}
      />
    </BaseMenu.Item>
  );
}

interface MenuContentProps {
  children: ReactNode;
}

function UpdateAvailableIcon({ variant }: { variant: Variant }) {
  return (
    <span
      role="img"
      aria-label={variant === "ja" ? "アップデートが利用可能です" : "Update available"}
    >
      ★
    </span>
  );
}

function MenuContent({ children }: MenuContentProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner className={styles.positioner} align="start">
        <BaseMenu.Popup className={styles.popup}>{children}</BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export function Menu({
  variant,
  fontSize,
  soundEnabled,
  musicEnabled,
  onFontSizeChange,
  onSoundEnabledChange,
  onMusicEnabledChange,
  musicVolume,
  effectsVolume,
  onMusicVolumeChange,
  onEffectsVolumeChange,
  onInstall,
  onUpdate,
  onOnlineHelp,
  onAboutAnalytics,
}: MenuProps) {
  async function handleFeedbackClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const lines = [
      `- revision: ${import.meta.env.VITE_GIT_REVISION} (${import.meta.env.VITE_GIT_DESCRIPTION})`,
      `- variant: ${variant}`,
    ];

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
          .filter((brand) => brand.brand !== "Not)A;Brand")
          .map((brand) => `${brand.brand}/${brand.version}`)
          .join(", ");
        if (brands) lines.push(`- browser: ${brands}`);
        const platformInfo = [ua.platform, ua.platformVersion, ua.architecture]
          .filter(Boolean)
          .join(" ");
        if (platformInfo) lines.push(`- platform: ${platformInfo}`);
        if (ua.model) lines.push(`- model: ${ua.model}`);
        highEntropySucceeded = true;
      } catch {
        // Fall through to the userAgent fallback.
      }
    }
    if (!highEntropySucceeded) lines.push(`- userAgent: ${navigator.userAgent}`);

    lines.push(`- client size: ${window.innerWidth}x${window.innerHeight}`);
    lines.push(`- pixel density: ${window.devicePixelRatio}`);
    lines.push(`- font size: ${fontSize}`);
    lines.push(`- standalone: ${window.matchMedia("(display-mode: standalone)").matches}`);

    try {
      const { usage, quota, usageDetails } = await navigator.storage.estimate();
      const quotaText = quota != null ? ` / ${quota}` : "";
      if (usageDetails) {
        const details = Object.entries(usageDetails)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        lines.push(`- storage: ${details}${quotaText}`);
      } else if (usage != null) {
        lines.push(`- storage: ${usage}${quotaText}`);
      }
    } catch {
      // Storage estimates are not available in every browser.
    }

    const body = lines.join("\n");
    const href = `https://github.com/hanazuki/hengband-web/issues/new?title=Feedback:%20&body=${encodeURIComponent(body)}`;
    window.open(href, "_blank");
  }

  return (
    <nav className={styles.menu} id="menu">
      <Menubar className={styles.menubar} modal={false}>
        <span>{variant === "ja" ? "変愚蛮怒" : "Hengband"}</span>

        <BaseMenu.Root>
          <BaseMenu.Trigger className={styles.trigger}>
            {onUpdate && <UpdateAvailableIcon variant={variant} />}
            {variant === "ja" ? "ゲーム" : "Game"}
          </BaseMenu.Trigger>
          {(onInstall || onUpdate) && (
            <MenuContent>
              {onInstall && (
                <BaseMenu.Item className={styles.item} onClick={onInstall}>
                  {variant === "ja" ? "アプリをインストール…" : "Install app…"}
                </BaseMenu.Item>
              )}
              {onInstall && onUpdate && <BaseMenu.Separator className={styles.separator} />}
              {onUpdate && (
                <BaseMenu.Item className={styles.item} onClick={onUpdate}>
                  <UpdateAvailableIcon variant={variant} />
                  {variant === "ja" ? "アップデートを適用…" : "Apply update…"}
                </BaseMenu.Item>
              )}
            </MenuContent>
          )}
        </BaseMenu.Root>

        <BaseMenu.Root>
          <BaseMenu.Trigger className={styles.trigger}>
            {variant === "ja" ? "表示" : "View"}
          </BaseMenu.Trigger>
          <MenuContent>
            <StepperItem
              variant={variant}
              value={fontSize}
              min={8}
              max={32}
              onChange={onFontSizeChange}
            >
              {variant === "ja" ? "文字サイズ" : "Font size"}
            </StepperItem>
          </MenuContent>
        </BaseMenu.Root>

        <BaseMenu.Root>
          <BaseMenu.Trigger className={styles.trigger}>
            {variant === "ja" ? "音声" : "Audio"}
          </BaseMenu.Trigger>
          <MenuContent>
            <BaseMenu.CheckboxItem
              checked={musicEnabled}
              className={styles.checkboxItem}
              closeOnClick
              onCheckedChange={onMusicEnabledChange}
            >
              {variant === "ja" ? "楽曲" : "Music"}
            </BaseMenu.CheckboxItem>
            <BaseMenu.CheckboxItem
              checked={soundEnabled}
              className={styles.checkboxItem}
              closeOnClick
              onCheckedChange={onSoundEnabledChange}
            >
              {variant === "ja" ? "効果音" : "Effects"}
            </BaseMenu.CheckboxItem>
            <BaseMenu.Separator className={styles.separator} />
            <BaseMenu.Group>
              <BaseMenu.GroupLabel className={styles.groupLabel}>
                {variant === "ja" ? "音量" : "Volume"}
              </BaseMenu.GroupLabel>
              <StepperItem
                variant={variant}
                value={musicVolume}
                min={0}
                max={10}
                onChange={onMusicVolumeChange}
              >
                {variant === "ja" ? "楽曲" : "Music"}
              </StepperItem>
              <StepperItem
                variant={variant}
                value={effectsVolume}
                min={0}
                max={10}
                onChange={onEffectsVolumeChange}
              >
                {variant === "ja" ? "効果音" : "Effects"}
              </StepperItem>
            </BaseMenu.Group>
          </MenuContent>
        </BaseMenu.Root>

        <BaseMenu.Root>
          <BaseMenu.Trigger className={styles.trigger}>
            {variant === "ja" ? "ヘルプ" : "Help"}
          </BaseMenu.Trigger>
          <MenuContent>
            <BaseMenu.Item className={styles.item} disabled={!onOnlineHelp} onClick={onOnlineHelp}>
              {variant === "ja" ? "オンライン・ヘルプ" : "Online help"}
            </BaseMenu.Item>
            <BaseMenu.Separator className={styles.separator} />
            <BaseMenu.LinkItem
              className={styles.linkItem}
              href="https://github.com/hanazuki/hengband-web/issues/new"
              onClick={handleFeedbackClick}
              rel="noopener"
              target="_blank"
            >
              {variant === "ja" ? "フィードバックを送信" : "Send feedback"}
            </BaseMenu.LinkItem>
            <BaseMenu.LinkItem
              className={styles.linkItem}
              href="https://github.com/hanazuki/hengband-web"
              rel="noopener"
              target="_blank"
            >
              {variant === "ja" ? "ソースコード" : "Go to source code"}
            </BaseMenu.LinkItem>
            <BaseMenu.LinkItem
              className={styles.linkItem}
              href="/licenses.txt"
              rel="noopener"
              target="_blank"
            >
              {variant === "ja" ? "ライセンス表示" : "Software licenses"}
            </BaseMenu.LinkItem>
            <BaseMenu.Separator className={styles.separator} />
            <BaseMenu.Item className={styles.item} onClick={onAboutAnalytics}>
              {variant === "ja" ? "アクセス解析について…" : "About Analytics…"}
            </BaseMenu.Item>
          </MenuContent>
        </BaseMenu.Root>
      </Menubar>
    </nav>
  );
}
