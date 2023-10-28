const axios = require('axios');
const { isRaining, isWindy, stateChangeEmitter } = require('./mqttHandler');
const sharedState = require('./sharedState');
const envSwitcher = require('./envSwitcher');
const { connectToRedis } = require('./redisClient');
const namespaces = require('./namespace');

const baseUrl = envSwitcher.baseUrl;
const urlMap = {
    'markise/switch/haupt': `${baseUrl}/set/tuya.0.8407060570039f7fa6d2.1`,
};

async function checkConditionsAndSendValues() {
    try {
        const markiseStatusNamespace = namespaces.markiseStatus;
        const redisClient = await connectToRedis();

        const lastExecutionTimestamp = await redisClient.get(`${markiseStatusNamespace}:markise:last_execution_timestamp`);
        const now = Date.now();
        const timeSinceLastExecution = now - (lastExecutionTimestamp || 0);

        if (timeSinceLastExecution < 2 * 60 * 1000) { 
            return;
        }

        if (isRaining() || isWindy()) {
            console.log('Rain or wind detected, sending values...');
            sendValue(2, markiseStatusNamespace);
            await delay(40000);  // Wait for 40 seconds
            sendValue(3, markiseStatusNamespace);

            await redisClient.set(`${markiseStatusNamespace}:markise:throttling_active`, 'true');

            await redisClient.set(`${markiseStatusNamespace}:markise:last_execution_timestamp`, now.toString());

            sharedState.timeoutOngoing = true;  // Use sharedState to update the flag

            setTimeout(async () => {
                await redisClient.set(`${markiseStatusNamespace}:markise:throttling_active`, 'false');
                sharedState.timeoutOngoing = false;  // Use sharedState to update the flag
            }, 2 * 60 * 1000);  // Reset the throttling after 15 minutes
        }
    } catch (error) {
        console.error('Error in checkConditionsAndSendValues:', error);
    }
}

async function sendValue(value, markiseStatusNamespace) {
    const topic = 'markise/switch/haupt';
    const url = urlMap[topic];

    // Add 'state' as a query parameter to the URL
    const apiUrl = new URL(url);
    apiUrl.searchParams.append('value', value);

    try {
        const response = await axios.get(apiUrl.toString());

        const redisClient = await connectToRedis();

        let action;
        if (value === 2) {
            action = 'closing';
        } else if (value === 3) {
            action = 'stopping';
        }

        if (action) {
            if (isRaining()) {
                const redisKey = `${markiseStatusNamespace}:markise:weather:raining`;
                await redisClient.set(redisKey, action);
            }
            if (isWindy()) {
                const redisKey = `${markiseStatusNamespace}:markise:weather:windy`;
                await redisClient.set(redisKey, action);
            }
        }

    } catch (error) {
        console.error(`Failed to send value: ${value}`, error);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute the function initially
checkConditionsAndSendValues();

// Listen for state changes and execute the function when they occur
stateChangeEmitter.on('stateChanged', checkConditionsAndSendValues);
