# Dockerfile for FAIVOR Dashboard (SvelteKit + Bun)
# FROM oven/bun:1

FROM node:24-bookworm

WORKDIR /app
COPY dashboard .

RUN npm i -g bun
RUN bun install

EXPOSE 5173
CMD ["bun", "run", "dev"]
