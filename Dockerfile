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
WORKDIR /usr/src/viteclient
COPY ./viteclient/package*.json ./
RUN npm install
COPY ./viteclient .
ARG VERSION
RUN echo "VITE_APP_VERSION=${VERSION}" > .env
RUN npm run build

# Build the Node.js app
FROM node:18-slim AS app-build
WORKDIR /usr/src/nodeserver
COPY ./nodeserver/package*.json ./
RUN npm install --only=production
COPY ./nodeserver .

# Copy built React app as a sibling
COPY --from=client-build /usr/src/viteclient/dist ../viteclient/dist

# Copy nodebackend library as a sibling
COPY --from=nodebackend-build /usr/src/nodebackend ../nodebackend

EXPOSE 8523
CMD [ "node", "index.js" ]
