declare module "#wasm/ja/hengband" {
  import type { HengbandFactory } from "./hengband";

  const createModule: HengbandFactory;
  export default createModule;
}
declare module "#wasm/en/hengband" {
  import type { HengbandFactory } from "./hengband";

  const createModule: HengbandFactory;
  export default createModule;
}
