import { getOpenAI } from './configs';
import { queryAllData, WeatherData } from './clients/influxdb-client';
import getCurrentDate from './utils/currentDate';
import { connectToRedis } from './clients/redisClient';
import { evaluateConditions, generateEvaluationSentences } from './traditionalCheck';
import logger from './logger';

interface CompletionResponse {
  result: boolean;
  response: string;
  formattedEvaluation: string | null;
}

function isKeyOfWeatherdata(key: string): key is keyof WeatherData {
  return ["outTemp", "wind", "humidity", "rainSum", "rainToday", "rainRate"].includes(key);
}

async function createChatCompletion(): Promise<CompletionResponse> {
  try {
    logger.info("Starting chat completion...");

    const { weekday, month } = getCurrentDate();

    const results = await queryAllData();
    logger.info("Received data from InfluxDB:", results);

    const client = await connectToRedis();
    const gptRequest = await client.get("gptRequestKey");

    if (gptRequest === null) {
      logger.error("gptrequest not available");
      throw new Error("gptrequest is null")
    }



    const formattedGptRequest = gptRequest.replace(/\$\{results\.([a-zA-Z]+)\}/g, (_, key) => {
      if (isKeyOfWeatherdata(key)) {
        return results[key] !== undefined ? results[key].toString() : '';
      }
      logger.warn(`Unbekannter Schlüssel in gptRequest: ${key}`);
      return "";
    })
      .replace(/\$\{month\}/g, month)
      .replace(/\$\{weekday\}/g, weekday);

    const openai = await getOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { "role": "system", "content": "You are a helpful assistant." },
        { "role": "user", "content": formattedGptRequest }
      ],
      max_tokens: 1000,
      temperature: 0.0,
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error("Incomplete response from GPT.");
    }

    const response = completion.choices[0].message.content || "Die Antwort ist leer";
    if (/result is true/i.test(response)) {
      return {
        result: true,
        response: response,
        formattedEvaluation: null
      };
    } else if (/result is false/i.test(response)) {
      return {
        result: false,
        response: response,
        formattedEvaluation: null
      };
    } else {
      logger.warn('Unexpected response from GPT:', response);

      const traditionalEvaluation = evaluateConditions(results);
      const allConditionsMet = Object.values(traditionalEvaluation.evaluations).every(condition => condition);
      const traditionalResponse = allConditionsMet ?
        'GPT-3 gibt keine klare Antwort, überprüfe traditionell...'
        : 'GPT-3 gibt keine klare Antwort, überprüfe traditionell...';
      const formattedEvaluation = generateEvaluationSentences(results);

      return {
        result: allConditionsMet,
        response: traditionalResponse,
        formattedEvaluation: formattedEvaluation
      };
    }

  } catch (error) {
    logger.error("Error in createChatCompletion:", error);
    throw error;
  }
}

export default createChatCompletion;
