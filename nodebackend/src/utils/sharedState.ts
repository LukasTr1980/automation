// sharedState.ts
export const sharedState = {
    timeoutOngoing: false,
    // When true the scheduler will skip AI verification and execute scheduled
    // irrigation tasks directly. This can be toggled via the API from the
    // frontend (e.g. a "disable AI verification" button).
    skipAiVerification: false
};
