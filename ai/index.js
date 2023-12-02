const shouldTurnOnIrrigation = require('../nodebackend/build/gptChatCompletion').default;

async function isIrrigationNeeded() {
  const data = await shouldTurnOnIrrigation();

  return data;
}

module.exports = isIrrigationNeeded;
