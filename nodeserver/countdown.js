// countdown.js
const logger = require('../nodebackend/build/logger').default;
const { connectToRedis } = require('../nodebackend/build/clients/redisClient');
const MqttPublisher = require('./mqtt/mqttPublisher');

const publisher = new MqttPublisher();

const countdownPrefix = 'countdown:';

const controlKeySuffix = ':countdownControl';
const hoursKeySuffix = ':countdownHours';
const minutesKeySuffix = ':countdownMinutes';
const countdownKeySuffix = ':value';

let countdownIntervals = {};

async function updateHoursAndMinutes(topic) {
    const client = await connectToRedis();
    const countdownKey = countdownPrefix + topic + countdownKeySuffix;
    const hoursKey = countdownPrefix + topic + hoursKeySuffix;
    const minutesKey = countdownPrefix + topic + minutesKeySuffix;

    const countdownValueStr = await client.get(countdownKey);
    let countdownValue = countdownValueStr ? parseInt(countdownValueStr) : 0;

    // Corrected the calculations for hours and minutes
    const currentHours = Math.floor(countdownValue / 3600);
    countdownValue %= 3600;  // Update countdownValue to the remainder after extracting hours
    const currentMinutes = Math.floor(countdownValue / 60);

    await Promise.all([
        client.set(hoursKey, currentHours.toString()),
        client.set(minutesKey, currentMinutes.toString())
    ]);
}

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

    if (action === 'stop') {
        sendSignal(topic, false);
        if (countdownIntervals[topic]) {
            clearInterval(countdownIntervals[topic]);
            delete countdownIntervals[topic];
        }
        return;
    }

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
        } else if (countdownValue === 0 || controlSignal === 'stop') {
            clearInterval(intervalId);
            if (countdownValue === 0 || controlSignal === 'stop') {
                sendSignal(topic, false);
                await client.set(controlKey, 'stop');  // Automatically stop when countdown reaches 0
            }
        }
    }, 1000);
    countdownIntervals[topic] = intervalId;
}

async function updateCountdowns(topic) {
    const client = await connectToRedis();

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
            await updateHoursAndMinutes(topic);
            sendSignal(topic, false);
        }
        return;
    }
}

async function sendSignal(topic, state) {
    try {
        publisher.publish(topic, state.toString(), (err) => {
            if (err) {
                logger.error('Error while publishing message:', err);
            } else {
                logger.info('Message published successfully');
            }
        });
    } catch (error) {
        logger.error('Error:', error);
    }
}

module.exports = {
    initiateCountdown,
    updateCountdowns
};
