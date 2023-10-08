# APPLY IN FOLDER FOR EXAMPLE /node for node/automation and node/ai and node/automation/client

# Build the React app
FROM node:18-slim AS client-build
WORKDIR /usr/src/client
COPY ./viteclient/package*.json ./
RUN npm install
COPY ./viteclient .
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
# Copy built React app
COPY --from=client-build /usr/src/client/build ./viteclient/build
# Copy AI app as a sibling
COPY --from=ai-build /usr/src/ai ../ai
COPY ./nodeserver .
EXPOSE 8523
CMD [ "node", "index.js" ]
