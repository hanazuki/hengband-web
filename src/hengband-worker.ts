import type { HengbandFactory } from "./hengband";

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type !== "init") return;

  const { assetBase, buffer } = e.data as {
    assetBase: string;
    buffer: SharedArrayBuffer;
  };

  const { default: factory } = (await import(/* @vite-ignore */ `${assetBase}.js`)) as {
    default: HengbandFactory;
  };

  const mod = await factory({
    locateFile: (p) => `${assetBase}${p.replace(/^hengband/, "")}`,
    noInitialRun: true,
    _web_on_output: (bytes: Uint8Array) => {
      self.postMessage({ type: "output", data: bytes }, [bytes.buffer]);
    },
    onExit: (code: number) => {
      self.postMessage({ type: "exit", code });
    },
  });

  (mod as unknown as Record<string, unknown>).__sharedI32 = new Int32Array(buffer);
  (mod as unknown as Record<string, unknown>).__sharedU8 = new Uint8Array(buffer);

  const idbfs = mod.FS.filesystems.IDBFS;
  const mkdirOk = (path: string) => {
    try {
      mod.FS.mkdir(path);
    } catch (err) {
      if ((err as { errno?: number }).errno !== 20) throw err;
    }
  };
  mkdirOk("/lib/save");
  mkdirOk("/lib/user");
  mkdirOk("/lib/bone");

  if (idbfs) {
    mod.FS.mount(idbfs, { autoPersist: true }, "/lib/save");
    mod.FS.mount(idbfs, { autoPersist: true }, "/lib/user");
    mod.FS.mount(idbfs, { autoPersist: true }, "/lib/apex");
    mod.FS.mount(idbfs, { autoPersist: true }, "/lib/bone");
    await new Promise<void>((resolve) => {
      mod.FS.syncfs(true, (err) => {
        if (err) console.error("IDBFS initial sync failed:", err);
        resolve();
      });
    });
  } else {
    console.warn("IDBFS not available in this build; game saves will not persist");
  }

  self.postMessage({ type: "ready" });

  try {
    mod.callMain([]);
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== "ExitStatus") {
      self.postMessage({ type: "error", message: String(err) });
    }
  }
};
