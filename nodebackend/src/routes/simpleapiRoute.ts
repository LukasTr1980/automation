import express from 'express';
import MqttPublisher from '../utils/mqttPublisher';
import logger from '../logger';

const router = express.Router();
const publisher = new MqttPublisher();

router.post('/', async (req: express.Request, res: express.Response) => {
    const { topic, state } = req.body;

    try {
        publisher.publish(topic, state.toString(), (err: Error | null) => {
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

export default router;
