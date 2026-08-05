// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { lazy, Suspense, useEffect, useState } from "react";
import styles from "./App.module.css";
import { draculaTheme } from "./dracula";
import { Menu, type Variant } from "./Menu";
import { applyPwaUpdate, pwaApplyingUpdate, usePwaUpdate } from "./pwa";
import { StartScreen } from "./StartScreen";
import { UpdateDialog } from "./UpdateDialog";
import type { HengbandActions } from "./useHengband";

const Hengband = lazy(() => import("./Hengband").then(({ Hengband }) => ({ default: Hengband })));

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
interface Settings {
  fontSize: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
}

function parseFragment(hash: string): Variant | null {
  if (hash === "#ja") return "ja";
  if (hash === "#en") return "en";
  return null;
}

function loadSettings(): Settings {
  return {
    fontSize: Number(localStorage.getItem("hengband.fontSize")) || 14,
    soundEnabled: localStorage.getItem("hengband.sound") !== "false",
    musicEnabled: localStorage.getItem("hengband.music") !== "false",
    musicVolume: Number(localStorage.getItem("hengband.musicVolume") ?? "5"),
    effectsVolume: Number(localStorage.getItem("hengband.effectsVolume") ?? "5"),
  };
}

function useHashVariant(): Variant | null {
  const [variant, setVariant] = useState<Variant | null>(() => parseFragment(location.hash));
  useEffect(() => {
    function navigate(): void {
      const next = parseFragment(location.hash);
      if (variant === null) {
        if (next !== null) setVariant(next);
      } else location.reload();
    }
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    return () => {
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("popstate", navigate);
    };
  }, [variant]);
  return variant;
}

function useManifest(variant: Variant | null): void {
  useEffect(() => {
    if (variant === null) return;
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = `/${variant}.webmanifest`;
    link.type = "application/manifest+json";
    document.head.append(link);
    return () => link.remove();
  }, [variant]);
}

export function App() {
  const variant = useHashVariant();
  const [settings, setSettings] = useState(loadSettings);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [openOnlineHelp, setOpenOnlineHelp] = useState<(() => void) | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const update = usePwaUpdate();
  useManifest(variant);

  useEffect(() => {
    document.documentElement.style.setProperty("--fg-color", draculaTheme.foreground ?? null);
    document.documentElement.style.setProperty("--bg-color", draculaTheme.background ?? null);
    document.documentElement.style.setProperty("--bright-black", draculaTheme.brightBlack ?? null);
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontSize]);
  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  function save<K extends keyof Settings>(key: K, value: Settings[K], storageKey: string): void {
    setSettings((current) => ({ ...current, [key]: value }));
    localStorage.setItem(storageKey, String(value));
  }
  async function install(): Promise<void> {
    if (!installPrompt) return;
    await installPrompt.prompt();
    if ((await installPrompt.userChoice).outcome === "accepted") setInstallPrompt(null);
  }
  function ready(actions: HengbandActions): void {
    setOpenOnlineHelp(() => () => void actions.openOnlineHelp());
  }

  return (
    <div className={styles.app}>
      {variant === null ? (
        <StartScreen />
      ) : (
        <>
          <Menu
            variant={variant}
            {...settings}
            onFontSizeChange={(value) =>
              save("fontSize", Math.max(8, Math.min(32, value)), "hengband.fontSize")
            }
            onSoundEnabledChange={(value) => save("soundEnabled", value, "hengband.sound")}
            onMusicEnabledChange={(value) => save("musicEnabled", value, "hengband.music")}
            onMusicVolumeChange={(value) => save("musicVolume", value, "hengband.musicVolume")}
            onEffectsVolumeChange={(value) =>
              save("effectsVolume", value, "hengband.effectsVolume")
            }
            onInstall={installPrompt ? () => void install() : undefined}
            onUpdate={update.available ? () => setUpdateDialogOpen(true) : undefined}
            onOnlineHelp={openOnlineHelp ?? undefined}
          />
          <UpdateDialog
            variant={variant}
            currentVersion={import.meta.env.VITE_GIT_DESCRIPTION}
            version={update.version}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onConfirm={() => void applyPwaUpdate()}
          />
          <Suspense fallback={null}>
            <Hengband
              variant={variant}
              {...settings}
              isApplyingUpdate={pwaApplyingUpdate}
              onReady={ready}
              onExited={() => setOpenOnlineHelp(null)}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
