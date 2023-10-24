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
RUN npm install
COPY ./ai .

# Build the Node.js app
FROM node:18-slim
WORKDIR /usr/src/nodeserver
COPY ./nodeserver/package*.json ./
RUN npm install
# Copy built React app as a silbling
COPY --from=client-build /usr/src/viteclient/dist ../viteclient/dist
# Copy AI app as a sibling
COPY --from=ai-build /usr/src/ai ../ai
COPY ./nodeserver .
EXPOSE 8523
CMD [ "node", "index.js" ]
