export interface HengbandModuleOpts {
  locateFile?: (path: string) => string;
  _web_on_output?: (bytes: Uint8Array) => void;
  noInitialRun?: boolean;
}

export interface HengbandModule {
  callMain(args?: string[]): unknown;
  _web_push_key(key: number): void;
  _web_resize_term(cols: number, rows: number): void;
  _web_on_output?: (bytes: Uint8Array) => void;
  HEAPU8: Uint8Array;
}

export type HengbandFactory = (opts?: HengbandModuleOpts) => Promise<HengbandModule>;
