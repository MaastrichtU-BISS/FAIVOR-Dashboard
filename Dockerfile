# Dockerfile for FAIVOR Dashboard (SvelteKit + Bun)
FROM oven/bun:1

WORKDIR /app
COPY dashboard .

RUN bun install

EXPOSE 5173
CMD ["bun", "run", "dev"]
