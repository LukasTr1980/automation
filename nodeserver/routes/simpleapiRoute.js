const express = require('express');
const router = express.Router();
const MqttPublisher = require('../mqtt/mqttPublisher');
const logger = require('../../shared/logger');

const publisher = new MqttPublisher();

router.post('/', async function (req, res) {
    const { topic, state } = req.body;

    try {
        publisher.publish(topic, state.toString(), (err) => {
            if (err) {
                logger.error('Error while publishing message:', err);
                res.status(500).send('Error while publishing message to MQTT broker.');
            } else {
                res.send('Message published successfully.');
            }
        });
    } catch (error) {
        logger.error('Error:', error);
        res.status(500).send('An error occurred.');
    }
});

module.exports = router;