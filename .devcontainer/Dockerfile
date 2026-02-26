FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

WORKDIR /workspaces/trading-212-veroilmoitus

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
