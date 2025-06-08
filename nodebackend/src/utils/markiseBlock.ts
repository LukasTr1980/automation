import { isRaining, isWindy, stateChangeEmitter } from './mqttHandler';
import { sharedState } from './sharedState';
import { connectToRedis } from '../clients/redisClient';
import namespaces from '../namespace';
import MqttPublisher from './mqttPublisher';
import logger from '../logger';

const publisher = new MqttPublisher();

async function checkConditionsAndSendValues(): Promise<void> {
    try {
        const markiseStatusNamespace: string = namespaces.markiseStatus;
        const redisClient = await connectToRedis();

        const lastExecutionTimestamp = await redisClient.get(`${markiseStatusNamespace}:markise:last_execution_timestamp`);
        const now: number = Date.now();
        const timeSinceLastExecution: number = now - (Number(lastExecutionTimestamp) || 0);

        if (timeSinceLastExecution < 15 * 60 * 1000) { 
            return;
        }

        if (isRaining() || isWindy()) {
            logger.info('Rain or wind detected, sending values...');
            await sendValue(2, markiseStatusNamespace);
            await delay(40000);  // Wait for 40 seconds
            await sendValue(3, markiseStatusNamespace);

            await redisClient.set(`${markiseStatusNamespace}:markise:throttling_active`, 'true');

            await redisClient.set(`${markiseStatusNamespace}:markise:last_execution_timestamp`, now.toString());

            sharedState.timeoutOngoing = true;  // Use sharedState to update the flag

            setTimeout(async () => {
                await redisClient.set(`${markiseStatusNamespace}:markise:throttling_active`, 'false');
                sharedState.timeoutOngoing = false;  // Use sharedState to update the flag
            }, 15 * 60 * 1000);  // Reset the throttling after 15 minutes
        }
    } catch (error) {
        logger.error('Error in checkConditionsAndSendValues:', error);
    }
}

async function sendValue(value: number, markiseStatusNamespace: string): Promise<void> {
    const topic: string = 'markise/switch/haupt/set';

    try {
        publisher.publish(topic, value.toString(), (err?: Error | null) => {
            if (err) {
                logger.error(`Failed to send value: ${value}`, err);
            }
        });

        const redisClient = await connectToRedis();

        let action: string | undefined;
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
        logger.error(`Failed to send value: ${value}`, error);
    }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute the function initially
checkConditionsAndSendValues();

// Listen for state changes and execute the function when they occur
stateChangeEmitter.on('stateChanged', checkConditionsAndSendValues);
