/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GIT_REVISION: string;
  readonly VITE_WASM_BUILD_ID_JA: string;
  readonly VITE_WASM_BUILD_ID_EN: string;
}

interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

interface UADataValues {
  architecture?: string;
  bitness?: string;
  brands?: NavigatorUABrandVersion[];
  fullVersionList?: NavigatorUABrandVersion[];
  mobile?: boolean;
  model?: string;
  platform?: string;
  platformVersion?: string;
}

interface NavigatorUAData {
  getHighEntropyValues(hints: string[]): Promise<UADataValues>;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
}

interface StorageEstimate {
  usageDetails?: Record<string, number>;
}

declare module "*.yml" {
  // biome-ignore lint/suspicious/noExplicitAny: YAML content is dynamically typed
  const content: any;
  export default content;
}

declare module "virtual:hengband-xtra/sounds" {
  export class SoundMap {
    constructor(map: Record<string, string[]>);
    entries(): [string, string[]][];
    pick(key: string): string | null;
  }
  export const soundMap: SoundMap;
}

declare module "virtual:hengband-xtra/music" {
  export class MusicMap {
    pick(key: string): string | null;
  }
  export const musicMap: MusicMap;
}
