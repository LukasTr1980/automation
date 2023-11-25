const logger = require('../nodebackend/build/logger').default;
const config = require('../nodebackend/build/configs');
require('dotenv').config();


async function retrieveModel () {

    const openai = await config.getOpenAI();
    const response = await openai.models.retrieve("gpt-4");
    return response;
}

retrieveModel().then(response => {
    logger.info(response);
})