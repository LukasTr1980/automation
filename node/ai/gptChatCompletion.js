const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'ai', '.env') });
const { openai } = require('./configs');
const queryAllData = require('./influxdb-client');
const getCurrentDate = require('./currentDate');

async function createChatCompletion() {
  try {
    console.log("Starting chat completion...");

    const { weekday, month } = getCurrentDate();

    const results = await queryAllData();
    console.log("Received data from InfluxDB:", results);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { "role": "system", "content": "You are a helpful assistant." },
        {
          "role": "user", "content": ` Check the following conditions:
          T avg 7d ${results.outTemp}°C > 10°C,
          H avg 7d ${results.humidity}% < 80%,
          Rain tot 4d ${results.rainSum}mm < 25mm,
          Rain today ${results.rainToday}mm < 3mm,
          Rain now ${results.rainRate}mm/h =< 0mm/h.
          Current month: ${month} = March or April or May or June or July or August or September or October
          if ((Current month: ${month} = March or April or September or October) AND (Current day: ${weekday} = Monday or Wednesday or Friday or Sunday))

          Sum all conditions, if one condition is false, answer with the sentence result is false, else answer with the sentence result is true.` }
      ],
      max_tokens: 1000,
      temperature: 0.0,
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error("Incomplete response from GPT.");
    }

    const response = completion.choices[0].message.content;
    if (/result is true/i.test(response)) {
      return { result: true, response };
    } else if (/result is false/i.test(response)) {
      return { result: false, response };
    } else {
      throw new Error('Unexpected response from GPT: ' + response);
    }

  } catch (error) {
    console.error("Error in createChatCompletion:", error);
    throw error;
  }
}

module.exports = createChatCompletion;
