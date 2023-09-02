const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'ai', '.env') });
const { openai } = require('./configs');
const queryAllData = require('./influxdb-client');

async function createChatCompletion() {
  try {
    console.log("Starting chat completion...");

    const results = await queryAllData();
    console.log("Received data from InfluxDB:", results);

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { "role": "system", "content": "You are a helpful assistant." },
        {
          "role": "user", content: ` Check the following conditions:
          ${results.outTemp}°C > 10°C,
          ${results.humidity}% < 80%,
          ${results.rainSum}mm < 25mm,
          ${results.rainToday}mm < 3mm,
          ${results.rainRate}mm/h =< 0mm/h,
          Sum all conditions, if one condition is false, answer with the sentence result is false, else answer with the sentence result is true.` }
      ],
      max_tokens: 1000,
      temperature: 0.0,
    });

    if (!completion || !completion.data || !completion.data.choices || !completion.data.choices[0]) {
      throw new Error("Incomplete response from GPT.");
    }

    const response = completion.data.choices[0].message.content.toLowerCase();
    console.log("Received response from GPT:", response);

    if (response.includes('result is true')) {
      return true;
    } else if (response.includes('result is false')) {
      return false;
    } else {
      throw new Error('Unexpected response from GPT: ' + response);
    }

  } catch (error) {
    console.error("Error in createChatCompletion:", error);
    throw error;
  }
}

module.exports = createChatCompletion;
