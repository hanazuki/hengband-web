// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import type { HengbandFactory } from "../hengband";

const createModule: HengbandFactory = async () => {
  throw new Error("The WASM test stub must be mocked");
};

export default createModule;
