# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3010

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY public ./public
COPY src ./src

RUN chown -R node:node /app

USER node

EXPOSE 3010

CMD ["sh", "-c", "\
  mkdir -p /app/config && \
  [ -f /app/config/devices.json ] || printf '{}\\n' > /app/config/devices.json; \
  [ -f /app/config/settings.json ] || printf '{}\\n' > /app/config/settings.json; \
  exec node src/server.js \
"]
