# syntax=docker/dockerfile:1
# docker build -t shapez-ce-builder .
ARG TARGETPLATFORM=linux/amd64
FROM --platform=$TARGETPLATFORM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg default-jre git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY gulp ./gulp
COPY src ./src

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/tmp/jar-cache \
    (cp /tmp/jar-cache/runnable-texturepacker.jar gulp/ 2>/dev/null || true) && \
    npm ci && \
    (cp gulp/runnable-texturepacker.jar /tmp/jar-cache/ 2>/dev/null || true)

COPY electron/package.json electron/package-lock.json electron/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefix electron --ignore-scripts

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
