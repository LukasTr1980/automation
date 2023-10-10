// traditionalCheck.js
function evaluateConditions(results) {
    const evaluations = {
        outTempCheck: results.outTemp > 10,
        humidityCheck: results.humidity < 80,
        rainSumCheck: results.rainSum < 25,
        rainTodayCheck: results.rainToday < 3,
        rainRateCheck: results.rainRate <= 0
    };

    const comparedValues = {
        outTemp: `7-Tage-Temperatur ${results.outTemp}°C > 10°C?`,
        humidity: `7-Tage-Luftfeuchtigkeit ${results.humidity}% < 80%?`,
        rainSum: `4-Tage-Regen ${results.rainSum}mm < 25mm?`,
        rainToday: `Regen heute ${results.rainToday}mm < 3mm?`,
        rainRate: `Regenrate ${results.rainRate}mm/h <= 0mm/h?`
    };

    return { evaluations, comparedValues }
}

function generateEvaluationSentences(results) {
    const { evaluations, comparedValues } = evaluateConditions(results);

    const formattedEvaluation = Object.entries(comparedValues)
        .map(([key, value]) => {
            const evalKey = key.replace(/(outTemp|humidity|rainSum|rainToday|rainRate)/, '$1Check');
            return `${value}: ${evaluations[evalKey] ? 'Wahr' : 'Falsch'}`;
        })
        .join('\n');
    return formattedEvaluation;
}

module.exports = {
    evaluateConditions,
    generateEvaluationSentences,
};