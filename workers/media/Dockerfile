FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY workers/media ./workers/media

RUN useradd --create-home --uid 10001 velvet \
  && chown -R velvet:velvet /app
USER velvet

ENV NODE_ENV=production
CMD ["node", "workers/media/worker.mjs"]
