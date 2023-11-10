# Build the shared library
FROM node:18-slim AS shared-build
WORKDIR /usr/src/shared
COPY ./shared/package*.json ./
RUN npm install --only=production
COPY ./shared .

# Build the React app
FROM node:18-slim AS client-build
WORKDIR /usr/src/viteclient
COPY ./viteclient/package*.json ./
RUN npm install
COPY ./viteclient .
ARG VERSION
RUN echo "VITE_APP_VERSION=${VERSION}" > .env
RUN npm run build

# Build the AI app
FROM node:18-slim AS ai-build
WORKDIR /usr/src/ai
COPY ./ai/package*.json ./
RUN npm install --only=production
COPY ./ai .

# Build the Node.js app
FROM node:18-slim AS app-build
WORKDIR /usr/src/nodeserver
COPY ./nodeserver/package*.json ./
RUN npm install --only=production
COPY ./nodeserver .

# Copy built React app as a sibling
COPY --from=client-build /usr/src/viteclient/dist ../viteclient/dist

# Copy AI app as a sibling
COPY --from=ai-build /usr/src/ai ../ai

# Copy shared library as a sibling
COPY --from=shared-build /usr/src/shared ../shared

EXPOSE 8523
CMD [ "node", "index.js" ]
