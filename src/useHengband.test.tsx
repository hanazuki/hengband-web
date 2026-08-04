// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hengband, type HengbandProps } from "./Hengband";

interface TerminalMock {
  options: { fontSize: number };
  dispose: ReturnType<typeof vi.fn>;
}

interface EngineMock {
  setEffectsEnabled: ReturnType<typeof vi.fn>;
  setMusicEnabled: ReturnType<typeof vi.fn>;
  setMusicVolume: ReturnType<typeof vi.fn>;
  setEffectsVolume: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
  terminals: [] as TerminalMock[],
  engines: [] as EngineMock[],
  observers: [] as Array<{
    disconnect: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
  }>,
  moduleOptions: null as Record<string, (...args: never[]) => unknown> | null,
  callMain: vi.fn(),
  resize: vi.fn(),
  pushKey: vi.fn(),
}));

vi.mock("virtual:hengband-xtra/music", () => ({ musicMap: {} }));
vi.mock("virtual:hengband-xtra/sounds", () => ({ soundMap: {} }));

vi.mock("@xterm/addon-web-links", () => ({ WebLinksAddon: class {} }));
vi.mock("@xterm/addon-webgl", () => ({ WebglAddon: class {} }));
vi.mock("./fit-addon", () => ({
  FitAddon: class {
    fit = vi.fn();
  },
}));
vi.mock("./hengband-unicode", () => ({ HengbandUnicodeAddon: class {} }));

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options = { fontSize: 0 };
    unicode = { activeVersion: "" };
    cols = 80;
    rows = 24;
    loadAddon = vi.fn();
    open = vi.fn();
    focus = vi.fn();
    write = vi.fn();
    input = vi.fn();
    dispose = vi.fn();
    onData = vi.fn(() => ({ dispose: vi.fn() }));

    constructor(options: { fontSize: number }) {
      this.options.fontSize = options.fontSize;
      mocks.terminals.push(this);
    }
  },
}));

vi.mock("./audio", () => ({
  SoundEngine: class {
    setEffectsEnabled = vi.fn();
    setMusicEnabled = vi.fn();
    setMusicVolume = vi.fn();
    setEffectsVolume = vi.fn();
    preloadAll = vi.fn();
    enableAudio = vi.fn();
    playSound = vi.fn();
    playMusic = vi.fn();
    playMusicScene = vi.fn();
    dispose = vi.fn();

    constructor() {
      mocks.engines.push(this);
    }
  },
}));

function createModule(options: Record<string, (...args: never[]) => unknown>) {
  mocks.moduleOptions = options;
  return Promise.resolve({
    callMain: mocks.callMain,
    _web_push_key: mocks.pushKey,
    _web_resize_term: mocks.resize,
    HEAPU8: new Uint8Array(),
    FS: {
      mkdir: vi.fn(),
      mount: vi.fn(),
      syncfs: vi.fn((_populate: boolean, callback: (error: Error | null) => void) =>
        callback(null),
      ),
      filesystems: { IDBFS: {} },
    },
  });
}

vi.mock("#wasm/ja/hengband", () => ({ default: createModule }));
vi.mock("#wasm/en/hengband", () => ({ default: createModule }));

const defaultProps: HengbandProps = {
  variant: "en",
  fontSize: 14,
  soundEnabled: true,
  musicEnabled: true,
  musicVolume: 5,
  effectsVolume: 5,
};

beforeEach(() => {
  mocks.terminals.length = 0;
  mocks.engines.length = 0;
  mocks.observers.length = 0;
  mocks.moduleOptions = null;
  mocks.callMain.mockReset();
  mocks.resize.mockReset();
  mocks.pushKey.mockReset();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = vi.fn();
      observe = vi.fn();

      constructor() {
        mocks.observers.push(this);
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useHengband", () => {
  it("survives Strict Mode setup and cleanup", async () => {
    const onReady = vi.fn();
    const result = render(
      <StrictMode>
        <Hengband {...defaultProps} onReady={onReady} />
      </StrictMode>,
    );

    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(mocks.terminals).toHaveLength(2);
    expect(mocks.terminals[0].dispose).toHaveBeenCalledOnce();
    expect(mocks.engines[0].dispose).toHaveBeenCalledOnce();

    result.unmount();
    expect(mocks.terminals[1].dispose).toHaveBeenCalledOnce();
    expect(mocks.engines[1].dispose).toHaveBeenCalledOnce();
    expect(mocks.observers[0].disconnect).toHaveBeenCalledOnce();
  });

  it("applies setting changes without restarting the game", async () => {
    const onReady = vi.fn();
    const result = render(<Hengband {...defaultProps} onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());

    result.rerender(
      <Hengband
        {...defaultProps}
        effectsVolume={8}
        fontSize={18}
        musicEnabled={false}
        onReady={onReady}
      />,
    );

    expect(mocks.terminals).toHaveLength(1);
    expect(mocks.terminals[0].options.fontSize).toBe(18);
    expect(mocks.engines[0].setMusicEnabled).toHaveBeenLastCalledWith(false);
    expect(mocks.engines[0].setEffectsVolume).toHaveBeenLastCalledWith(0.8);
  });
});
