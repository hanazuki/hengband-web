# hengband-web

Play [Hengband](https://github.com/hengband/hengband) in the browser via WebAssembly.

Game progress is persisted across sessions using IndexedDB. Both Japanese and English builds are supported.

## Requirements

- [Docker](https://www.docker.com/) — required to build the WebAssembly binaries
- [pnpm](https://pnpm.io/) — JavaScript package manager

## Build

```sh
# Build WASM binaries and the frontend
./build.sh
```

The build script:
1. Applies patches from `patches/` to the hengband submodule
2. Compiles both JP and EN WASM variants using Emscripten (inside Docker)
3. Places `hengband-jp.{js,wasm}` and `hengband-en.{js,wasm}` in `public/`
4. Runs `vite build` to bundle the frontend

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

## Architecture

- **Frontend**: Svelte + Vite + TypeScript
- **Terminal**: xterm.js
- **WASM toolchain**: Emscripten (via Docker, `emscripten/emsdk`)
- **Persistence**: Emscripten IDBFS backed by browser IndexedDB
- **Linter/Formatter**: Biome
