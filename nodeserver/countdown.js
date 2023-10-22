// countdown.js
const connectToRedis = require('./redisClient');
const { buildUrlMap } = require('./buildUrlMap');
const axios = require('axios');
const { broadcastToSseClients } = require('./sseHandler');

const countdownPrefix = 'countdown:';

const controlKeySuffix = ':countdownControl';
const hoursKeySuffix = ':countdownHours';
const minutesKeySuffix = ':countdownMinutes';
const countdownKeySuffix = ':value';

let countdownIntervals = {};

async function initiateCountdown(topic, hours, minutes, action) {
    const client = await connectToRedis();
    let countdownValue = (hours * 3600) + (minutes * 60);  // Moved out of setInterval
    const controlKey = countdownPrefix + topic + controlKeySuffix;
    const countdownKey = countdownPrefix + topic + countdownKeySuffix;

    // Initially set Redis keys
    await Promise.all([
        client.set(countdownKey, countdownValue.toString()),
        client.set(controlKey, action)
    ]);

    if (action === 'reset') {
        sendSignal(topic, false);
        return;
    } else if (action === 'start') {
        sendSignal(topic, true);
    }

    if (countdownIntervals[topic]) {
        clearInterval(countdownIntervals[topic]);
        delete countdownIntervals[topic];
    }

    // Update Redis key every second
    const intervalId = setInterval(async () => {
        const controlSignal = await client.get(controlKey);
        if (controlSignal === 'start' && countdownValue > 0) {
            countdownValue--;
            await client.set(countdownKey, countdownValue.toString());
            broadcastToSseClients(topic, countdownValue.toString());
        } else if (countdownValue === 0 || controlSignal === 'stop') {
            clearInterval(intervalId);
            if (countdownValue === 0 || controlSignal === 'stop') {
                sendSignal(topic, false);
                await client.set(controlKey, 'stop');  // Automatically stop when countdown reaches 0
                broadcastToSseClients(topic, 0);
            }
        }
    }, 1000);
    countdownIntervals[topic] = intervalId;
}

async function updateCountdowns(topic) {
    const client = await connectToRedis();
    const urlMap = await buildUrlMap();

    const controlKey = countdownPrefix + topic + controlKeySuffix;
    const countdownKey = countdownPrefix + topic + countdownKeySuffix;
    const hoursKey = countdownPrefix + topic + hoursKeySuffix;
    const minutesKey = countdownPrefix + topic + minutesKeySuffix;

    const controlSignal = await client.get(controlKey);

    if (controlSignal === 'reset') {

        await Promise.all([
            client.set(countdownKey, '0'),
            client.set(hoursKey, '0'),
            client.set(minutesKey, '0')
        ]);
        sendSignal(topic, false);
    } 

    if (countdownIntervals[topic]) {
        clearInterval(countdownIntervals[topic]);
        delete countdownIntervals[topic];
    }

    if (controlSignal === 'start') {
        if (!countdownIntervals[topic]) {
            countdownIntervals[topic] = setInterval(async () => {
                const countdownValueStr = await client.get(countdownKey);
                let countdownValue = countdownValueStr ? parseInt(countdownValueStr) : 0;
                if (countdownValue > 0) {
                    countdownValue--;
                    await client.set(countdownKey, countdownValue.toString());
                } else {
                    clearInterval(countdownIntervals[topic]);
                    delete countdownIntervals[topic];
                    sendSignal(topic, false);
                    await client.set(controlKey, 'stop');
                }
            }, 1000);
        }
    } else if (controlSignal === 'stop' || controlSignal === 'reset') {
        if (countdownIntervals[topic]) {
            clearInterval(countdownIntervals[topic]);
            delete countdownIntervals[topic];
        }
        if (controlSignal === 'stop') {
            sendSignal(topic, false);
        }
    }
}

async function sendSignal(topic, state) {
    const urlMap = await buildUrlMap();
    const url = urlMap[topic];
    const apiUrl = new URL(url);
    apiUrl.searchParams.append('value', state.toString());

    try {
        const response = await axios.get(apiUrl.toString());
        console.log('API response:', response.data);
    } catch (error) {
        console.error('Error while sending request:', error);
    }
}

module.exports = {
    initiateCountdown,
    updateCountdowns
};
