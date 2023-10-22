//sseHandler.js
const sseClients = [];

// Broadcast a message to all active SSE clients
const broadcastToSseClients = (topic, msg) => {
    const dataString = `data: ${JSON.stringify({ type: 'switchState', topic, state: msg })}\n\n`;
    sseClients.forEach(client => {
        client.write(dataString);
    });
};

// Add a new SSE client to the list and handle its closure
const addSseClient = (client) => {
    sseClients.push(client);
    client.on('close', () => {
        const index = sseClients.indexOf(client);
        if (index !== -1) {
            sseClients.splice(index, 1);
        }
    });
};

module.exports = {
    broadcastToSseClients,
    addSseClient
};
