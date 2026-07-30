# syntax=docker/dockerfile:1

# ------------------------------------------------------------
# Stage 1: Install production dependencies
# ------------------------------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force


# ------------------------------------------------------------
# Stage 2: Production runtime
# ------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Install dumb-init so Node receives shutdown signals correctly.
RUN apk add --no-cache dumb-init \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY --from=dependencies \
  --chown=appuser:appgroup \
  /app/node_modules \
  ./node_modules

COPY --chown=appuser:appgroup \
  package.json \
  package-lock.json \
  ./

COPY --chown=appuser:appgroup \
  src \
  ./src

# Temporary working folders used while processing uploads.
RUN mkdir -p /app/uploads /app/tmp \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=20s \
  --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "start"]
