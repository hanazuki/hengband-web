export interface HengbandModuleOpts {
  locateFile?: (path: string) => string;
  _web_on_output?: (bytes: Uint8Array) => void;
  _web_on_sound?: (name: string) => void;
  noInitialRun?: boolean;
  onExit?: (code: number) => void;
}

export interface EmscriptenFS {
  mkdir(path: string): void;
  mount(filesystem: unknown, opts: { autoPersist?: boolean }, mountpoint: string): void;
  syncfs(populate: boolean, callback: (err: Error | null) => void): void;
  filesystems: { IDBFS: unknown };
}

export interface HengbandModule {
  callMain(args?: string[]): unknown;
  _web_push_key(key: number): void;
  _web_resize_term(cols: number, rows: number): void;
  _web_on_output?: (bytes: Uint8Array) => void;
  HEAPU8: Uint8Array;
  FS: EmscriptenFS;
}

export type HengbandFactory = (opts?: HengbandModuleOpts) => Promise<HengbandModule>;
