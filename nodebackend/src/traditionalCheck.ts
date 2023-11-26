type Result = {
    outTemp: number;
    humidity: number;
    rainSum: number;
    rainToday: number;
    rainRate: number;
};

type Evaluations = {
    outTempCheck: boolean;
    humidityCheck: boolean;
    rainSumCheck: boolean;
    rainTodayCheck: boolean;
    rainRateCheck: boolean;
};

type ComparedValues = {
    outTemp: string;
    humidity: string;
    rainSum: string;
    rainToday: string;
    rainRate: string;
};

function evaluateConditions(results: Result): { evaluations: Evaluations; comparedValues: ComparedValues } {
    const evaluations: Evaluations = {
        outTempCheck: results.outTemp > 10,
        humidityCheck: results.humidity < 80,
        rainSumCheck: results.rainSum < 25,
        rainTodayCheck: results.rainToday < 3,
        rainRateCheck: results.rainRate <= 0
    };

    const comparedValues: ComparedValues = {
        outTemp: `7-Tage-Temperatur ${results.outTemp}°C > 10°C?`,
        humidity: `7-Tage-Luftfeuchtigkeit ${results.humidity}% < 80%?`,
        rainSum: `4-Tage-Regen ${results.rainSum}mm < 25mm?`,
        rainToday: `Regen heute ${results.rainToday}mm < 3mm?`,
        rainRate: `Regenrate ${results.rainRate}mm/h <= 0mm/h?`
    };

    return { evaluations, comparedValues };
}

function generateEvaluationSentences(results: Result): string {
    const { evaluations, comparedValues } = evaluateConditions(results);

    const formattedEvaluation = Object.entries(comparedValues)
        .map(([key, value]) => {
            const evalKey = key.replace(/(outTemp|humidity|rainSum|rainToday|rainRate)/, '$1Check') as keyof Evaluations;
            return `${value}: ${evaluations[evalKey] ? 'Wahr' : 'Falsch'}`;
        })
        .join('\n');
    return formattedEvaluation;
}

export { evaluateConditions, generateEvaluationSentences };
