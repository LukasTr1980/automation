const openai = require('./configs');
require('dotenv').config();


async function retrieveModel () {

      const response = await openai.retrieveModel("gpt-3.5-turbo");
      return response;
}

retrieveModel().then(response => {
    console.log(response.data);
})