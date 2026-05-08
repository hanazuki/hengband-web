#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
HENGBAND_SRC="$REPO_ROOT/hengband"
CCACHE_DIR="$REPO_ROOT/tmp/ccache"
WASM_DIR="$REPO_ROOT/wasm"
IMAGE_NAME="hengband-build"

mkdir -p "$CCACHE_DIR" "$WASM_DIR"

if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
    docker build --build-arg CI -t "$IMAGE_NAME" "$REPO_ROOT"
fi
exec docker run --rm \
     -u "$(id -u):$(id -g)" \
     --mount type=bind,src="$HENGBAND_SRC",dst=/work \
     --mount type=bind,src="$WASM_DIR",dst=/output \
     --mount type=bind,src="$CCACHE_DIR",dst=/tmp/ccache \
     "$IMAGE_NAME" \
     "/output" "$@"
