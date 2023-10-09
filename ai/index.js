const shouldTurnOnIrrigation = require('./gptChatCompletion');

async function isIrrigationNeeded() {
  const { result, response } = await shouldTurnOnIrrigation();
  
  // If you want to do something with the response, you can do it here.
  // For example, you might want to log it:
  console.log("GPT Response:", response);

  return {result, response};
}

module.exports = isIrrigationNeeded;
