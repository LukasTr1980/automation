const shouldTurnOnIrrigation = require('./gptChatCompletion');

async function isIrrigationNeeded() {
  return await shouldTurnOnIrrigation();
}

module.exports = isIrrigationNeeded;
