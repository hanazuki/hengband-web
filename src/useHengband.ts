// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband

import { musicMap } from "virtual:hengband-xtra/music";
import { soundMap } from "virtual:hengband-xtra/sounds";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { type RefObject, useEffect, useRef, useState } from "react";
import { SoundEngine } from "./audio";
import { draculaTheme } from "./dracula";
import { FitAddon } from "./fit-addon";
import type { HengbandFactory, HengbandModule } from "./hengband";
import { HengbandUnicodeAddon } from "./hengband-unicode";

export type HengbandVariant = "ja" | "en";

export interface HengbandActions {
  openOnlineHelp(): Promise<void>;
}

export interface UseHengbandOptions {
  variant: HengbandVariant;
  fontSize: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  isApplyingUpdate?(): boolean;
  onReady?(actions: HengbandActions): void;
  onExited?(): void;
}

export interface UseHengbandResult {
  containerRef: RefObject<HTMLDivElement | null>;
  error: string | null;
  exited: boolean;
}

interface CurrentOptions {
  fontSize: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  isApplyingUpdate: () => boolean;
  onReady?: (actions: HengbandActions) => void;
  onExited?: () => void;
}

function createCurrentOptions(options: UseHengbandOptions): CurrentOptions {
  return {
    ...options,
    isApplyingUpdate: options.isApplyingUpdate ?? (() => false),
  };
}

function createDirectory(module: HengbandModule, path: string): void {
  try {
    module.FS.mkdir(path);
  } catch (error) {
    if ((error as { errno?: number }).errno !== 20) throw error;
  }
}

async function mountPersistentFilesystems(module: HengbandModule): Promise<void> {
  createDirectory(module, "/lib/save");
  createDirectory(module, "/lib/user");
  createDirectory(module, "/lib/bone");

  const idbfs = module.FS.filesystems.IDBFS;
  if (!idbfs) {
    console.warn("IDBFS not available in this build; game saves will not persist");
    return;
  }

  for (const path of ["/lib/save", "/lib/user", "/lib/apex", "/lib/bone"]) {
    module.FS.mount(idbfs, { autoPersist: true }, path);
  }

  await new Promise<void>((resolve) => {
    module.FS.syncfs(true, (error) => {
      if (error) console.error("IDBFS initial sync failed:", error);
      resolve();
    });
  });
}

async function loadFactory(variant: HengbandVariant): Promise<HengbandFactory> {
  const imported = (await (variant === "ja"
    ? import("#wasm/ja/hengband")
    : import("#wasm/en/hengband"))) as { default: HengbandFactory };
  return imported.default;
}

export function useHengband(options: UseHengbandOptions): UseHengbandResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const engineRef = useRef<SoundEngine | null>(null);
  const optionsRef = useRef<CurrentOptions>(createCurrentOptions(options));
  const [error, setError] = useState<string | null>(null);
  const [exited, setExited] = useState(false);

  optionsRef.current = createCurrentOptions(options);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.fontSize = options.fontSize;
  }, [options.fontSize]);

  useEffect(() => {
    engineRef.current?.setEffectsEnabled(options.soundEnabled);
  }, [options.soundEnabled]);

  useEffect(() => {
    engineRef.current?.setMusicEnabled(options.musicEnabled);
  }, [options.musicEnabled]);

  useEffect(() => {
    engineRef.current?.setMusicVolume(options.musicVolume / 10);
  }, [options.musicVolume]);

  useEffect(() => {
    engineRef.current?.setEffectsVolume(options.effectsVolume / 10);
  }, [options.effectsVolume]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerElement = container;

    let active = true;
    let hasExited = false;
    let module: HengbandModule | null = null;
    let observer: ResizeObserver | null = null;
    let beforeUnload: ((event: BeforeUnloadEvent) => void) | null = null;
    let inputSubscription: { dispose(): void } | null = null;
    const terminal = new Terminal({
      scrollback: 1000,
      allowProposedApi: true,
      theme: draculaTheme,
      fontSize: optionsRef.current.fontSize,
    });
    const fitAddon = new FitAddon();
    const engine = new SoundEngine(soundMap, musicMap);

    terminalRef.current = terminal;
    engineRef.current = engine;
    setError(null);
    setExited(false);

    engine.setEffectsEnabled(optionsRef.current.soundEnabled);
    engine.setMusicEnabled(optionsRef.current.musicEnabled);
    engine.setMusicVolume(optionsRef.current.musicVolume / 10);
    engine.setEffectsVolume(optionsRef.current.effectsVolume / 10);

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new HengbandUnicodeAddon());
    terminal.loadAddon(new WebglAddon());
    terminal.loadAddon(new WebLinksAddon());
    terminal.unicode.activeVersion = "hengband";
    terminal.open(container);

    const openOnlineHelp = async (): Promise<void> => {
      terminal.input("\x1b\x1b\x1b", false);
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      if (!active) return;
      terminal.input("?", false);
      terminal.focus();
    };

    async function initialize(): Promise<void> {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!active) return;
      fitAddon.fit();
      terminal.focus();
      terminal.write(
        options.variant === "ja" ? "ゲームをダウンロードしています……" : "Downloading the game...",
      );

      const createModule = await loadFactory(options.variant);
      if (!active) return;

      const decoder = new TextDecoder();
      module = await createModule({
        noInitialRun: true,
        onExit: (code) => {
          if (!active) return;
          hasExited = true;
          terminal.write("\x1b[H\x1b[2J");
          if (code !== 0) {
            terminal.write(
              options.variant === "ja"
                ? `ゲームが異常終了しました。(${code})`
                : `The game ended abnormally. (${code})`,
            );
            terminal.write("\r\n");
          }
          terminal.write(
            options.variant === "ja"
              ? "ゲームを再開するにはページを再読み込みしてください。"
              : "Reload the page to restart the game.",
          );
          terminal.write("\r\n");
          setExited(true);
          optionsRef.current.onExited?.();
        },
        _web_on_output: (bytes) => {
          if (active) terminal.write(decoder.decode(bytes, { stream: true }));
        },
        _web_on_sound: (name) => engine.playSound(name),
        _web_on_music: (type, value) => engine.playMusic(type, value),
        _web_on_music_scene: (scene) => engine.playMusicScene(scene),
      });
      if (!active) return;

      void engine.preloadAll();
      let audioUnlocked = false;
      inputSubscription = terminal.onData((data) => {
        if (!audioUnlocked) {
          audioUnlocked = true;
          engine.enableAudio();
        }
        const bytes = new TextEncoder().encode(data);
        for (const byte of bytes) module?._web_push_key(byte);
      });

      const resizeTerminal = () => {
        fitAddon.fit();
        module?._web_resize_term(terminal.cols, terminal.rows);
      };
      observer = new ResizeObserver(resizeTerminal);
      observer.observe(containerElement);

      await mountPersistentFilesystems(module);
      if (!active) return;

      beforeUnload = (event) => {
        if (!hasExited && !optionsRef.current.isApplyingUpdate()) event.preventDefault();
      };
      window.addEventListener("beforeunload", beforeUnload);

      Promise.resolve(module.callMain([])).catch((reason: unknown) => {
        if (active) setError(String(reason));
      });
      optionsRef.current.onReady?.({ openOnlineHelp });
    }

    initialize().catch((reason: unknown) => {
      if (active) setError(String(reason));
    });

    return () => {
      active = false;
      observer?.disconnect();
      inputSubscription?.dispose();
      if (beforeUnload) window.removeEventListener("beforeunload", beforeUnload);
      terminal.dispose();
      engine.dispose();
      if (terminalRef.current === terminal) terminalRef.current = null;
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [options.variant]);

  return { containerRef, error, exited };
}
