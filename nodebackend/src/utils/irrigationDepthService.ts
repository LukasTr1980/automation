// Pumpenspezifikationen
const PUMP_RATE_L_PER_MIN = 83; // Liter pro Minute
const RUN_TIME_MIN = 9;         // Minuten pro Lauf
const AREA_M2 = 120;            // zu bewässernde Fläche in m²

// Export single-run depth so other modules (soil bucket) can reuse it
export const RUN_DEPTH_MM = (PUMP_RATE_L_PER_MIN * RUN_TIME_MIN) / AREA_M2;
