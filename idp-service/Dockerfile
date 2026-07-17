# Stage 1: Install production dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev


# Stage 2: Create the runtime image
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create a non-root application user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["npm", "start"]
