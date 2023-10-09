const { flux } = require('@influxdata/influxdb-client');
const bucket = 'iobroker';

const computeDateFourDaysAgo = () => {
    // Get the current date
    const currentDate = new Date();

    // Subtract 4 days
    currentDate.setDate(currentDate.getDate() - 4);

    currentDate.setHours(0, 0, 0, 0);

    // Return the date as a string in ISO format
    return currentDate.toISOString();
}

const startDate = computeDateFourDaysAgo();

function constructRainSumQuery(startDate) {
    return `
        from(bucket: "${bucket}")
          |> range(start: time(v: "${startDate}"), stop: now())
          |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Regen_Tag")
          |> filter(fn: (r) => r["_field"] == "value")
          |> aggregateWindow(every: 1d, fn: max)
          |> sum(column: "_value")
    `;
}

const rainsumQuery = constructRainSumQuery(startDate);

const outTempQuery = flux`
    from(bucket: "${bucket}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Aussentemperatur")
      |> filter(fn: (r) => r["_field"] == "value")
      |> mean(column: "_value")
`;

const windQuery = flux`
    from(bucket: "${bucket}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Wind")
      |> filter(fn: (r) => r["_field"] == "value")
      |> mean(column: "_value")
`;

const humidityQuery = flux`
    from(bucket: "${bucket}")
      |> range(start: -7d)
      |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.FT0300_Feuchte_1")
      |> filter(fn: (r) => r["_field"] == "value")
      |> mean(column: "_value")
`;

const rainTodayQuery = flux`
    import "timezone"
    option location = timezone.location(name: "Europe/Rome")
    from(bucket: "iobroker")
      |> range(start: today())
      |> filter(fn: (r) => r["_measurement"] == "javascript.0.Wetterstation.Regen_Tag")
      |> filter(fn: (r) => r._field == "value")
      |> last()
`;

const rainrate = flux`
    from(bucket: "${bucket}")
      |> range(start: -3h)
      |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Weathercloud_Regenrate")
      |> filter(fn: (r) => r["_field"] == "value")
      |> last()
`;

module.exports = {
    outTempQuery,
    windQuery,
    humidityQuery,
    rainsumQuery,
    rainTodayQuery,
    rainrate
};
