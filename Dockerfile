# Use npm 11 for install/prune commands without replacing the bundled npm binary in the image.
ARG NPM_VERSION=11.12.1

# Build the nodebackend library
FROM node:22-slim AS nodebackend-build
ARG NPM_VERSION
WORKDIR /usr/src/nodebackend
COPY ./nodebackend/package*.json ./nodebackend/tsconfig.json ./
RUN npx -y npm@${NPM_VERSION} ci
COPY ./nodebackend .
RUN npm run build
RUN npx -y npm@${NPM_VERSION} prune --omit=dev

# Build the React app
FROM node:22-slim AS client-build
ARG NPM_VERSION
WORKDIR /usr/src/viteclientts
COPY ./viteclientts/package*.json ./
RUN npx -y npm@${NPM_VERSION} ci
COPY ./viteclientts .
ARG VERSION
RUN echo "VITE_APP_VERSION=${VERSION}" > .env
RUN npm run build

# Final stage: Setup the nodebackend to run
FROM node:22-slim
WORKDIR /usr/src/nodebackend
COPY --from=nodebackend-build /usr/src/nodebackend .
COPY --from=client-build /usr/src/viteclientts/dist ../viteclientts/dist

EXPOSE 8523
CMD ["node", "build/index.js"]
