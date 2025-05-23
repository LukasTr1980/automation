// src/services/gptChatCompletion.ts
// -----------------------------------------------------------------------------
//  Thin adapter: ruft den AI-Entscheider auf und liefert das alte FE-Schema
// -----------------------------------------------------------------------------

import {
  createIrrigationDecision,
  CompletionResponse as DecisionResponse,
} from "./gptChatCompletion";

// Frontend erwartet weiterhin CompletionResponse
export type CompletionResponse = DecisionResponse;

export default async function shouldTurnOnIrrigation(): Promise<CompletionResponse> {
  return await createIrrigationDecision();   // direkte Weitergabe, kein Mapping nötig
}
