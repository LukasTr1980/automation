const { Point } = require('@influxdata/influxdb-client');
const { influxDbClient } = require('./config');

const org = 'villaanna';
const bucket = 'automation';
const writeApi = influxDbClient.getWriteApi(org, bucket);

function writeToInflux(topic, message) {

    const point = new Point('mqtt_data').tag('topic', topic);

    if (message.toLowerCase() === 'true' || message.toLowerCase() === 'false') {
        const booleanValue = message.toLowerCase() === 'true';
        point.booleanField('value_boolean', booleanValue);
    } else {
        const numValue = parseFloat(message);
        if (!isNaN(numValue)) {
            point.floatField('value_numeric', numValue);
        } else {
            console.error(`Invalid data type received for message: ${message}`);
            return; // Exit if the message data type isn't supported
        }
    }

    writeApi.writePoint(point);

    writeApi.flush()
        .then(() => {
            console.log('Data written to InfluxDB');
        })
        .catch((error) => {
            console.error('Error writing data to InfluxDB', error);
        });
}

module.exports = {
    writeToInflux
};
