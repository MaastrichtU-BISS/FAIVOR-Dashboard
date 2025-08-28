# Dockerfile for FAIVOR Dashboard (SvelteKit + Bun)
FROM oven/bun:1

# FROM node:24-bookworm

RUN apt update && apt upgrade -y


WORKDIR /app
COPY dashboard .

RUN cp _example.env .env

# second time it should work? based on https://github.com/oven-sh/bun/issues/7947
RUN bun install || true && bun install

RUN bun build

EXPOSE 5173
CMD ["bun", "./build/index.js"]
