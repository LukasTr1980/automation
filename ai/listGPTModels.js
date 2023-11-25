const logger = require('../nodebackend/build/logger').default;
const config = require('../nodebackend/build/configs');
require('dotenv').config();

async function listModels() {
  const openai = await config.getOpenAI();
  const response = await openai.models.list();
  return response;
}

listModels().then(response => {
  logger.info(response);
});
