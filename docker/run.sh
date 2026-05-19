#!/bin/bash
set -euo pipefail

DESTDIR=$1
VARIANT=${2:-}

export EM_COMPILER_WRAPPER=ccache
export CCACHE_DIR=/tmp/ccache

./bootstrap

build_variant() {
    local variant="$1" # "ja" or "en"
    shift

    emconfigure ./configure \
        --host=wasm32 \
        --disable-pch \
        --enable-web \
        --without-x \
        --with-libpath=/lib/ \
        --with-varpath=/save/"$variant" \
        "$@" \
        CXXFLAGS="-O2"

    emmake make clean
    emmake make -j"$(nproc)"

    rm -rf "$DESTDIR/$variant"
    mkdir -p "$DESTDIR/$variant"
    cp src/hengband.js "$DESTDIR/$variant/"
    cp src/hengband.wasm "$DESTDIR/$variant/"
    if [ -f src/hengband.data ]; then
        cp src/hengband.data "$DESTDIR/$variant/"
    fi
}

case "$VARIANT" in
    ja) build_variant ja ;;
    en) build_variant en --disable-japanese ;;
    "")
        build_variant ja
        build_variant en --disable-japanese
        ;;
    *) echo "Unknown variant: $VARIANT" >&2; exit 1 ;;
esac

echo "WASM outputs written to $DESTDIR"
