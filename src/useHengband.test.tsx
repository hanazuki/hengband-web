// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hengband, type HengbandProps } from "./Hengband";

interface TerminalMock {
  options: { fontSize: number };
  dispose: ReturnType<typeof vi.fn>;
  input: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  inputSubscription: { dispose: ReturnType<typeof vi.fn> };
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
  moduleOptions: null as { onExit?: (code: number) => void } | null,
  factoryError: null as Error | null,
  callMain: vi.fn(),
  resize: vi.fn(),
  pushKey: vi.fn(),
  mkdir: vi.fn(),
  mount: vi.fn(),
  syncfs: vi.fn(),
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
    inputSubscription = { dispose: vi.fn() };
    onData = vi.fn(() => this.inputSubscription);

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

function createModule(options: { onExit?: (code: number) => void }) {
  if (mocks.factoryError) return Promise.reject(mocks.factoryError);
  mocks.moduleOptions = options;
  return Promise.resolve({
    callMain: mocks.callMain,
    _web_push_key: mocks.pushKey,
    _web_resize_term: mocks.resize,
    HEAPU8: new Uint8Array(),
    FS: {
      mkdir: mocks.mkdir,
      mount: mocks.mount,
      syncfs: mocks.syncfs,
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
  mocks.factoryError = null;
  mocks.callMain.mockReset();
  mocks.resize.mockReset();
  mocks.pushKey.mockReset();
  mocks.mkdir.mockReset();
  mocks.mount.mockReset();
  mocks.syncfs.mockReset();
  mocks.syncfs.mockImplementation((_populate: boolean, callback: (error: Error | null) => void) =>
    callback(null),
  );
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

  it("initializes persistent filesystems before starting the game", async () => {
    const onReady = vi.fn();
    render(<Hengband {...defaultProps} onReady={onReady} />);

    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(mocks.mkdir.mock.calls.map(([path]) => path)).toEqual([
      "/lib/save",
      "/lib/user",
      "/lib/bone",
    ]);
    expect(mocks.mount.mock.calls.map(([, options, path]) => [options, path])).toEqual([
      [{ autoPersist: true }, "/lib/save"],
      [{ autoPersist: true }, "/lib/user"],
      [{ autoPersist: true }, "/lib/apex"],
      [{ autoPersist: true }, "/lib/bone"],
    ]);
    expect(mocks.syncfs).toHaveBeenCalledWith(true, expect.any(Function));
    expect(mocks.syncfs.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.callMain.mock.invocationCallOrder[0],
    );
  });

  it("removes browser and terminal subscriptions on unmount", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const result = render(<Hengband {...defaultProps} onReady={vi.fn()} />);

    await waitFor(() =>
      expect(addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function)),
    );
    result.unmount();

    expect(mocks.observers[0].disconnect).toHaveBeenCalledOnce();
    expect(mocks.terminals[0].inputSubscription.dispose).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(mocks.terminals[0].dispose).toHaveBeenCalledOnce();
    expect(mocks.engines[0].dispose).toHaveBeenCalledOnce();
  });

  it("guards unload except during an accepted PWA update", async () => {
    let applyingUpdate = false;
    render(
      <Hengband {...defaultProps} isApplyingUpdate={() => applyingUpdate} onReady={vi.fn()} />,
    );
    await waitFor(() => expect(mocks.callMain).toHaveBeenCalledOnce());

    const ordinaryUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ordinaryUnload);
    expect(ordinaryUnload.defaultPrevented).toBe(true);

    applyingUpdate = true;
    const updateUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(updateUnload);
    expect(updateUnload.defaultPrevented).toBe(false);
  });

  it("reports module loading failures without leaking resources", async () => {
    mocks.factoryError = new Error("WASM download failed");
    const result = render(<Hengband {...defaultProps} />);

    expect(await screen.findByText("Error: WASM download failed")).not.toBeNull();
    result.unmount();
    expect(mocks.terminals[0].dispose).toHaveBeenCalledOnce();
    expect(mocks.engines[0].dispose).toHaveBeenCalledOnce();
  });

  it("reports asynchronous game failures", async () => {
    mocks.callMain.mockRejectedValueOnce(new Error("main failed"));
    render(<Hengband {...defaultProps} />);

    expect(await screen.findByText("Error: main failed")).not.toBeNull();
  });

  it("renders abnormal exits and releases the unload guard", async () => {
    const onExited = vi.fn();
    render(<Hengband {...defaultProps} onExited={onExited} onReady={vi.fn()} />);
    await waitFor(() => expect(mocks.moduleOptions).not.toBeNull());

    mocks.moduleOptions?.onExit?.(7);

    expect(onExited).toHaveBeenCalledOnce();
    expect(mocks.terminals[0].write).toHaveBeenCalledWith("The game ended abnormally. (7)");
    expect(mocks.terminals[0].write).toHaveBeenCalledWith("Reload the page to restart the game.");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });
});
