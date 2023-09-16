const { openai } = require('./configs');
require('dotenv').config();

async function listModels() {
  const response = await openai.listModels();
  return response;
}

listModels().then(response => {
  console.log(response.data.data);
});
