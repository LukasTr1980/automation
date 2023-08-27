const openai = require('./openaiConfig');
require('dotenv').config();

async function listModels() {
  const response = await openai.listModels();
  return response;
}

listModels().then(response => {
  console.log(response.data.data);
});
