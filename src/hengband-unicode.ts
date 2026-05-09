import type { ITerminalAddon, Terminal } from "@xterm/xterm";

// Unicode width provider mirroring Hengband's EUC-JP width logic:
// any character encoded as a 2-byte EUC-JP sequence occupies 2 terminal columns.
// Since the terminal only ever renders EUC-JP output, all non-ASCII codepoints
// come from 2-byte sequences and are therefore always width 2.
class HengbandUnicodeProvider {
  readonly version = "hengband";

  wcwidth(codepoint: number): 0 | 1 | 2 {
    if (codepoint < 0x20) return 0;
    if (codepoint < 0x80) return 1;
    return 2;
  }

  charProperties(codepoint: number, _preceding: number): number {
    // Relies on xterm.js internal UnicodeService.createPropertyValue(charKind, width, shouldJoin)
    // packing: bits[0]=shouldJoin, bits[1-2]=width, bits[3+]=charKind. Not part of the public API.
    return this.wcwidth(codepoint) << 1;
  }
}

export class HengbandUnicodeAddon implements ITerminalAddon {
  activate(terminal: Terminal): void {
    terminal.unicode.register(new HengbandUnicodeProvider());
  }

  dispose(): void {}
}
