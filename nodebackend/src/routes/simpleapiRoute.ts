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
                res.status(500).send('errorWhilePerformingTheSwitching');
            } else {
                res.send('switchingPerformed');
            }
        });
    } catch (error) {
        logger.error('Error:', error);
        res.status(500).send('internalServerError');
    }
});

export default router;
