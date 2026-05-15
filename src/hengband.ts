export interface HengbandModuleOpts {
  locateFile?: (path: string) => string;
  noInitialRun?: boolean;
  _web_on_output?: (bytes: Uint8Array) => void;
  onExit?: (code: number) => void;
}

export interface EmscriptenFS {
  mkdir(path: string): void;
  mount(filesystem: unknown, opts: { autoPersist?: boolean }, mountpoint: string): void;
  syncfs(populate: boolean, callback: (err: Error | null) => void): void;
  filesystems: { IDBFS: unknown };
}

export interface HengbandModule {
  callMain(args?: string[]): void;
  FS: EmscriptenFS;
  _sharedI32: Int32Array;
  _sharedU8: Uint8Array;
}

export type HengbandFactory = (opts?: HengbandModuleOpts) => Promise<HengbandModule>;

// SAB layout (1048 bytes):
//   i32[0] signal     — futex word; set to 1 by main thread on key/resize, reset to 0 by worker
//   i32[1] writeHead  — next write position in key ring (0–1023), written by main thread
//   i32[2] readHead   — next read position in key ring (0–1023), written by worker
//   i32[3] resizeFlag — 0 = none pending, 1 = resize pending
//   i32[4] newCols    — columns for pending resize
//   i32[5] newRows    — rows for pending resize
//   u8[24..1047]      — 1024-byte key ring
export class RingBuffer {
  private static readonly SIGNAL = 0;
  private static readonly WRITE_HEAD = 1;
  private static readonly READ_HEAD = 2;
  private static readonly RESIZE_FLAG = 3;
  private static readonly NEW_COLS = 4;
  private static readonly NEW_ROWS = 5;
  private static readonly RING_OFFSET = 24;
  private static readonly RING_SIZE = 1024;

  readonly buffer: SharedArrayBuffer;
  private readonly i32: Int32Array;
  private readonly u8: Uint8Array;

  constructor() {
    this.buffer = new SharedArrayBuffer(1048);
    this.i32 = new Int32Array(this.buffer);
    this.u8 = new Uint8Array(this.buffer);
  }

  pushKey(key: number): void {
    const wh = Atomics.load(this.i32, RingBuffer.WRITE_HEAD);
    const next = (wh + 1) % RingBuffer.RING_SIZE;
    if (next === Atomics.load(this.i32, RingBuffer.READ_HEAD)) return; // ring full — drop silently
    this.u8[RingBuffer.RING_OFFSET + wh] = key;
    Atomics.store(this.i32, RingBuffer.WRITE_HEAD, next);
    Atomics.store(this.i32, RingBuffer.SIGNAL, 1);
    Atomics.notify(this.i32, RingBuffer.SIGNAL, 1);
  }

  pushResize(cols: number, rows: number): void {
    Atomics.store(this.i32, RingBuffer.NEW_COLS, cols);
    Atomics.store(this.i32, RingBuffer.NEW_ROWS, rows);
    Atomics.store(this.i32, RingBuffer.RESIZE_FLAG, 1);
    Atomics.store(this.i32, RingBuffer.SIGNAL, 1);
    Atomics.notify(this.i32, RingBuffer.SIGNAL, 1);
  }
}
