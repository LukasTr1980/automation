# Build the nodebackend library
FROM node:18-slim AS nodebackend-build
WORKDIR /usr/src/nodebackend
COPY ./nodebackend/package*.json ./nodebackend/tsconfig.json ./
RUN npm install --only=production
RUN npm install typescript
COPY ./nodebackend .
RUN npm run build

# Build the React app
FROM node:18-slim AS client-build
WORKDIR /usr/src/viteclientts
COPY ./viteclientts/package*.json ./
RUN npm install
COPY ./viteclientts .
ARG VERSION
RUN echo "VITE_APP_VERSION=${VERSION}" > .env
RUN npm run build

# Final stage: Setup the nodebackend to run
FROM node:18-slim
WORKDIR /usr/src/nodebackend
COPY --from=nodebackend-build /usr/src/nodebackend .
COPY --from=client-build /usr/src/viteclientts/dist ../viteclientts/dist

EXPOSE 8523
CMD ["node", "build/index.js"]
