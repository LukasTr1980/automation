const { isRaining, isWindy, stateChangeEmitter } = require('./mqttHandler');
const sharedState = require('./sharedState');
const { connectToRedis } = require('../shared/redisClient');
const namespaces = require('./namespace');
const MqttPublisher = require('./mqtt/mqttPublisher');

const publisher = new MqttPublisher();

async function checkConditionsAndSendValues() {
    try {
        const markiseStatusNamespace = namespaces.markiseStatus;
        const redisClient = await connectToRedis();

        const lastExecutionTimestamp = await redisClient.get(`${markiseStatusNamespace}:markise:last_execution_timestamp`);
        const now = Date.now();
        const timeSinceLastExecution = now - (lastExecutionTimestamp || 0);

        if (timeSinceLastExecution < 15 * 60 * 1000) { 
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
            }, 15 * 60 * 1000);  // Reset the throttling after 15 minutes
        }
    } catch (error) {
        console.error('Error in checkConditionsAndSendValues:', error);
    }
}

async function sendValue(value, markiseStatusNamespace) {
    const topic = 'markise/switch/haupt/set';

    try {
        publisher.publish(topic, value.toString(), (err) => {
            if (err) {
                console.error(`Failed to send value: ${value}`, err);
            }
        });

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
