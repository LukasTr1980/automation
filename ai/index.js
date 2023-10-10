const shouldTurnOnIrrigation = require('./gptChatCompletion');

async function isIrrigationNeeded() {
  const data = await shouldTurnOnIrrigation();

  return data;
}

module.exports = isIrrigationNeeded;
