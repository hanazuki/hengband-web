#!/usr/bin/env bash
# Build hengband WASM variants (JP and EN) via Emscripten.
# Run directly: ./build.sh
# Outside Docker this script re-invokes itself inside a Docker container.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
HENGBAND_SRC="$REPO_ROOT/hengband"
PUBLIC_DIR="$REPO_ROOT/public"
IMAGE_NAME="hengband-build"

# ── Docker bootstrap ───────────────────────────────────────────────────────────
if [ ! -f /.dockerenv ]; then
    docker build -t "$IMAGE_NAME" "$REPO_ROOT"
    exec docker run --rm \
        -v "$REPO_ROOT:/work" \
        -w /work \
        "$IMAGE_NAME" \
        bash build.sh "$@"
fi

# ── From here on we are inside Docker ─────────────────────────────────────────

cd "$HENGBAND_SRC"

# ── Generate configure ────────────────────────────────────────────────────────
./bootstrap

# ── Helper: build one variant ─────────────────────────────────────────────────
build_variant() {
    local variant="$1"   # "jp" or "en"
    local extra_flags="${2:-}"
    local build_dir="$HENGBAND_SRC/build-$variant"

    echo "=== Building $variant variant ==="
    rm -rf "$build_dir"
    mkdir -p "$build_dir"
    cd "$build_dir"

    emconfigure ../configure \
        --enable-web \
        --disable-net \
        --disable-worldscore \
        --with-libpath=/lib/ \
        --with-varpath=/save/$variant \
        $extra_flags \
        CXXFLAGS="-O2"

    emmake make -j"$(nproc)"

    mkdir -p "$PUBLIC_DIR"
    cp src/hengband.js   "$PUBLIC_DIR/hengband-$variant.js"
    cp src/hengband.wasm "$PUBLIC_DIR/hengband-$variant.wasm"
    if [ -f src/hengband.data ]; then
        cp src/hengband.data "$PUBLIC_DIR/hengband-$variant.data"
    fi

    echo "=== $variant variant done ==="
    cd "$HENGBAND_SRC"
}

build_variant jp ""
build_variant en "--disable-japanese"

echo "WASM outputs written to $PUBLIC_DIR"
