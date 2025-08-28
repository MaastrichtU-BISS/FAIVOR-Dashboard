# Dockerfile for FAIVOR Dashboard (SvelteKit + Bun)
FROM oven/bun:1

# FROM node:24-bookworm

RUN apt update && apt upgrade -y
# RUN apt install -y python3 python-is-python3 libpq-dev build-essential

WORKDIR /app
COPY dashboard .

# update npm to latest version
# RUN npm install -g npm@latest
# RUN npm rebuild

# RUN npm i -g bun
# second time it should work?
RUN bun install || true && bun install

EXPOSE 5173
CMD ["bun", "run", "dev"]
