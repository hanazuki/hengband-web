/// <reference types="vite/client" />

declare module "*.yml" {
  // biome-ignore lint/suspicious/noExplicitAny: YAML content is dynamically typed
  const content: any;
  export default content;
}
