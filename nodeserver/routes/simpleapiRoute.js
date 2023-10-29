const express = require('express');
const router = express.Router();
const axios = require('axios');
const { buildUrlMap } = require('../buildUrlMap');

router.post('/', async function (req, res) {
    const { topic, state } = req.body;
    const urlMap = await buildUrlMap();
    const url = urlMap[topic];

    // Add 'state' as a query parameter to the URL
    const apiUrl = new URL(url);
    apiUrl.searchParams.append('value', state);

    try {
        const response = await axios.get(apiUrl.toString());
        res.send(response.data);
    } catch (error) {
        console.error('Error while sending request:', error);
        res.status(500).send('Error while sending request to the API.');
    }
});

module.exports = router;