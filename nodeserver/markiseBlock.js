const axios = require('axios');
const { isRaining, isCold, isWindy, stateChangeEmitter } = require('./mqttHandler');
const sharedState = require('./sharedState');
const envSwitcher = require('./envSwitcher');

const baseUrl = envSwitcher.baseUrl;
const urlMap = {
    'markise/switch/haupt': `${baseUrl}/set/tuya.0.8407060570039f7fa6d2.1`,
};

let lastExecuted = null;

async function checkConditionsAndSendValues() {
    const now = new Date().getTime();

    // If the function has been executed in the last 15 minutes, just return
    if (lastExecuted && (now - lastExecuted) < 15 * 60 * 1000) {
        return;
    }

    if (isRaining() || isCold() || isWindy()) {
        sendValue(2);
        await delay(40000);  // Wait for 40 seconds
        sendValue(3);

        // Update the last executed time
        lastExecuted = now;

        sharedState.timeoutOngoing = true;  // Use sharedState to update the flag

        // Set a timeout to reset the lastExecuted after 15 minutes
        setTimeout(() => {
            lastExecuted = null;
            sharedState.timeoutOngoing = false;  // Use sharedState to update the flag
        }, 15 * 60 * 1000);
    }
}

async function sendValue(value) {
    const topic = 'markise/switch/haupt';
    const url = urlMap[topic];

    // Add 'state' as a query parameter to the URL
    const apiUrl = new URL(url);
    apiUrl.searchParams.append('value', value);

    try {
        const response = await axios.get(apiUrl.toString());
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
