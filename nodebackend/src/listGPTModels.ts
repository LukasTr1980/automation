import logger from './logger';
import * as config from './configs';
import dotenv from 'dotenv';
import { OpenAI } from 'openai'; // Import OpenAI
dotenv.config();

async function listModels() {
  const openai = await config.getOpenAI() as OpenAI;
  const response = await openai.models.list();
  return response; // The response type is inferred here
}

listModels().then(response => {
  logger.info(response);
});
