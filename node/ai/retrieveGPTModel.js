const { openai } = require('./configs');
require('dotenv').config();


async function retrieveModel () {

      const response = await openai.models.retrieve("gpt-4");
      return response;
}

retrieveModel().then(response => {
    console.log(response);
})