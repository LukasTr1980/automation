import shouldTurnOnIrrigation from './gptChatCompletion';

interface CompletionResponse {
  result: boolean;
  response: string;
  formattedEvaluation: string | null;
}

async function isIrrigationNeeded(): Promise<CompletionResponse> {
  const data: CompletionResponse = await shouldTurnOnIrrigation();

  return data;
}

export default isIrrigationNeeded;
