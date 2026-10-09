# Stage 1 - compile TypeScript to JavaScript.
# Development dependencies stay in this stage and never reach the final image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Stage 2 - runtime. Only production dependencies and compiled output.
FROM node:22-alpine
LABEL org.opencontainers.image.title="MAP proiect" \
      org.opencontainers.image.authors="Patkany Ecaterina <ecaterina.patkany@student.upt.ro>" \
      org.opencontainers.image.source="https://github.com/ecaterina-patkany/catalog-note-map"

ARG COMMIT=dev
ARG BUILT_AT=unknown
ENV APP_COMMIT=$COMMIT \
    APP_BUILT_AT=$BUILT_AT \
    NODE_ENV=production

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
