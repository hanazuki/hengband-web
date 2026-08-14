// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { exceptions, jspi } from "wasm-feature-detect";

export async function supportsRequiredWasmFeatures(): Promise<boolean> {
  try {
    const [jspiSupported, exceptionsSupported] = await Promise.all([jspi(), exceptions()]);
    return jspiSupported && exceptionsSupported;
  } catch {
    return false;
  }
}
