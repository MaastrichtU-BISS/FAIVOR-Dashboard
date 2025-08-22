# Dockerfile for FAIVOR Dashboard (SvelteKit + Bun)
# FROM oven/bun:1

FROM --platform=$BUILDPLATFORM node:lts-slim AS base

WORKDIR /app
COPY dashboard .

RUN npm i -g bun
RUN bun install

EXPOSE 5173
CMD ["bun", "run", "dev"]
