const express = require('express');
const router = express.Router();
const MqttPublisher = require('../mqtt/mqttPublisher');

const publisher = new MqttPublisher();

router.post('/', async function (req, res) {
    const { topic, state } = req.body;

    try {
        publisher.publish(topic, state.toString(), (err) => {
            if (err) {
                console.error('Error while publishing message:', err);
                res.status(500).send('Error while publishing message to MQTT broker.');
            } else {
                res.send('Message published successfully.');
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred.');
    }
});

module.exports = router;