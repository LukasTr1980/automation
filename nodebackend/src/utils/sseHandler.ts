import { Response } from 'express'; // or from 'http' if you are not using Express

const sseClients: Response[] = [];

const broadcastToSseClients = (topic: string, msg: string): void => {
    const dataString = `data: ${JSON.stringify({ type: 'switchState', topic, state: msg })}\n\n`;
    sseClients.forEach(client => {
        client.write(dataString);
    });
};

const addSseClient = (client: Response): void => {
    sseClients.push(client);
    client.on('close', () => {
        const index = sseClients.indexOf(client);
        if (index !== -1) {
            sseClients.splice(index, 1);
        }
    });
};

export {
    broadcastToSseClients,
    addSseClient
};
