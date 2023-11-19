const { Point } = require('@influxdata/influxdb-client');
const config = require('./config');
const logger = require('../shared/build/logger').default;

async function writeToInflux(topic, message) {
    const influxDbClient = await config.getInfluxDbClient();
    const writeApi = influxDbClient.getWriteApi('villaanna', 'automation');

    const point = new Point('mqtt_data').tag('topic', topic);

    if (message.toLowerCase() === 'true' || message.toLowerCase() === 'false') {
        const booleanValue = message.toLowerCase() === 'true';
        point.booleanField('value_boolean', booleanValue);
    } else {
        const numValue = parseFloat(message);
        if (!isNaN(numValue)) {
            point.floatField('value_numeric', numValue);
        } else {
            logger.error(`Invalid data type received for message: ${message}`);
            return; // Exit if the message data type isn't supported
        }
    }

    writeApi.writePoint(point);

    writeApi.flush()
        .then(() => {
            logger.info('Data written to InfluxDB');
        })
        .catch((error) => {
            logger.error('Error writing data to InfluxDB', error);
        });
}

module.exports = {
    writeToInflux
};
