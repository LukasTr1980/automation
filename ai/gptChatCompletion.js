const path = require('path');
const config = require('./configs');
const queryAllData = require('./influxdb-client');
const getCurrentDate = require('./currentDate');
const connectToRedis = require('./redisClient');
const traditionalCheck = require('./traditionalCheck');

async function createChatCompletion() {
  try {
    console.log("Starting chat completion...");

    const { weekday, month } = getCurrentDate();

    const results = await queryAllData();
    console.log("Received data from InfluxDB:", results);

    const client = await connectToRedis();
    const gptRequest = await client.get("gptRequestKey");

    const formattedGptRequest = gptRequest.replace(/\$\{results\.([a-zA-Z]+)\}/g, (_, key) => results[key])
                                          .replace(/\$\{month\}/g, month)
                                          .replace(/\$\{weekday\}/g, weekday);

    console.log("Formatted GPT Request:", formattedGptRequest);

    const openai = await config.getOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { "role": "system", "content": "You are a helpful assistant." },
        {
          "role": "user", "content": formattedGptRequest}
      ],
      max_tokens: 1000,
      temperature: 0.0,
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error("Incomplete response from GPT.");
    }

    const response = completion.choices[0].message.content;
    if (/result is true/i.test(response)) {
      return { 
        result: true, 
        response: response,
        formattedEvaluation: null
      };
    } else if (/result is false/i.test(response)) {
      return { 
        result: false, 
        response: response ,
        formattedEvaluation: null
      };
    } else {
      console.warn('Unexpected response from GPT:', response);

      const traditionalEvaluation = traditionalCheck.evaluateConditions(results);
      const allConditionsMet = Object.values(traditionalEvaluation.evaluations).every(condition => condition);
      const traditionalResponse = allConditionsMet ? 
      'GPT-3 gibt keine klare Antwort, überprüfe traditionell...' 
      : 'GPT-3 gibt keine klare Antwort, überprüfe traditionell...';
      const formattedEvaluation = traditionalCheck.generateEvaluationSentences(results);

      return { 
        result: allConditionsMet, 
        response: traditionalResponse,
        formattedEvaluation: formattedEvaluation
      };
    }

  } catch (error) {
    console.error("Error in createChatCompletion:", error);
    throw error;
  }
}

module.exports = createChatCompletion;
