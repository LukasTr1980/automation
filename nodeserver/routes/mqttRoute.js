const express = require('express');
const router = express.Router();
const { addSseClient, latestStates } = require('../../nodebackend/build/utils/mqttHandler');
const isIrrigationNeeded = require('../../nodebackend/build/gptChatIrrigation').default;

router.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    addSseClient(res);
    res.write(`data: ${JSON.stringify({ type: 'switchState', latestStates })}\n\n`);

    const data = await isIrrigationNeeded();
    if (data.result !== null) {
        const irrigationNeededData = {
            type: 'irrigationNeeded',
            state: data.result,
            response: data.response,
            formattedEvaluation: data.formattedEvaluation
        };
        res.write(`data: ${JSON.stringify(irrigationNeededData)}\n\n`);
    }
});

module.exports = router;