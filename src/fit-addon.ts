import { FitAddon as BaseFitAddon } from "@xterm/addon-fit";

const MAIN_TERM_MIN_COLS = 80;
const MAIN_TERM_MIN_ROWS = 24;

export class FitAddon extends BaseFitAddon {
  override proposeDimensions() {
    const dims = super.proposeDimensions();
    if (dims == null) return dims;
    return {
      cols: Math.max(dims.cols, MAIN_TERM_MIN_COLS),
      rows: Math.max(dims.rows, MAIN_TERM_MIN_ROWS),
    };
  }
}
