# syntax=docker/dockerfile:1

FROM emscripten/emsdk:5.0.7@sha256:4e332f7343b6f66320bf72f7ecc01a3d9f3866721a13b0e5c7b96505d6ab148a

ARG CI=

RUN <<EOF
if [ -z "$CI" ]; then
    sed -Ei 's!http://(archive|security).ubuntu.com/ubuntu!https://ftp.udx.icscoe.jp/Linux/ubuntu!g' /etc/apt/sources.list.d/ubuntu.sources
else
    sed -Ei 's!http://(archive|security).ubuntu.com/ubuntu!http://azure.archive.ubuntu.com/ubuntu!g' /etc/apt/sources.list.d/ubuntu.sources
fi
EOF

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        autoconf \
        automake \
        ccache \
        libtool \
        nkf \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY --chmod=0755 ./docker/run.sh /run.sh

WORKDIR /work
VOLUME /work
ENTRYPOINT ["/run.sh"]
