# Dockerfile for FAIVOR Dashboard (SvelteKit + Bun)
FROM oven/bun:1

# FROM node:24-bookworm

RUN apt update && apt upgrade -y


WORKDIR /app
COPY . .

# Create empty .env - all env vars are now dynamic (read at runtime)
RUN touch .env

# second time it should work? based on https://github.com/oven-sh/bun/issues/7947
RUN bun install || true && bun install

RUN bun run build

EXPOSE 5173
CMD ["bun", "./build/index.js"]
