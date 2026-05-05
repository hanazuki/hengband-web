FROM emscripten/emsdk:3.1.73

RUN apt-get update && apt-get install -y --no-install-recommends \
        autoconf \
        automake \
        libtool \
        nkf \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*
