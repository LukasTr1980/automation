const logger = require('../shared/build/logger');
const config = require('./configs');
require('dotenv').config();


async function retrieveModel () {

    const openai = await config.getOpenAI();
    const response = await openai.models.retrieve("gpt-4");
    return response;
}

retrieveModel().then(response => {
    logger.info(response);
})