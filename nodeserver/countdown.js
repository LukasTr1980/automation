const connectToRedis = require('./redisClient');
const { buildUrlMap } = require('./buildUrlMap');
const axios = require('axios');

const controlKeySuffix = ':countdownControl';
const hoursKeySuffix = ':countdownHours';
const minutesKeySuffix = ':countdownMinutes';
const countdownKeySuffix = ':countdownValue';

async function initiateCountdown(topic, hours, minutes) {
    const client = await connectToRedis();
    const countdownValue = (hours * 3600) + (minutes * 60);
    const controlKey = topic + controlKeySuffix;
    const countdownKey = topic + countdownKeySuffix;
    await Promise.all([
        client.set(countdownKey, countdownValue.toString()),
        client.set(controlKey, 'start')
    ]);
    sendSignal(topic, true);
}

async function updateCountdowns() {
    const client = await connectToRedis();
    const urlMap = await buildUrlMap();
    const topics = Object.keys(urlMap);

    for (const topic of topics) {
        const controlKey = topic + controlKeySuffix;
        const countdownKey = topic + countdownKeySuffix;
        const hoursKey = topic + hoursKeySuffix;
        const minutesKey = topic + minutesKeySuffix;

        const controlSignal = await client.get(controlKey);
        let countdownValue;

        if (controlSignal === 'reset') {
            const hoursStr = await client.get(hoursKey);
            const minutesStr = await client.get(minutesKey);
            const hours = hoursStr ? parseInt(hoursStr) : 0;
            const minutes = minutesStr ? parseInt(minutesStr) : 0;
            countdownValue = (hours * 3600) + (minutes * 60);
            await client.set(countdownKey, countdownValue.toString());
        } else {
            const countdownValueStr = await client.get(countdownKey);
            countdownValue = countdownValueStr ? parseInt(countdownValueStr) : 0;
        }

        if (controlSignal === 'start' && countdownValue > 0) {
            countdownValue--;
            await client.set(countdownKey, countdownValue.toString());
        } else if (countdownValue === 0) {
            sendSignal(topic, false);
            await client.set(controlKey, 'stop');  // Automatically stop when countdown reaches 0
        } else if (controlSignal === 'stop') {
            // Optionally, you could clear interval here if you have one
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
