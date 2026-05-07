# hengband-web

Play [Hengband](https://github.com/hengband/hengband) in the browser via WebAssembly.

Game progress is persisted across sessions using IndexedDB. Both Japanese and English builds are supported.

## Requirements

- [Docker](https://www.docker.com/) - required to build the WebAssembly binaries
- [pnpm](https://pnpm.io/) - JavaScript package manager

## Build

```sh
pnpm install
pnpm build:wasm && pnpm build
```

Output lands in `dist/`.

## Local Development

Install dependencies once:

```sh
pnpm install
```

Start the dev server (WASM binaries must already be in `public/` to play):

```sh
pnpm serve
```

Other commands:

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build → `dist/` |
| `pnpm serve` | Dev server at `localhost:5173` |
| `pnpm lint` | Check code with Biome |
| `pnpm lintfix` | Auto-fix lint/format issues |
| `pnpm typecheck` | TypeScript + Svelte type check |
| `pnpm test` | Run unit tests (Vitest) |
