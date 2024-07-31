import { flux } from '@influxdata/influxdb-client';

const bucket: string = 'iobroker';

const computeDateFourDaysAgo = (): string => {
    const currentDate: Date = new Date();

    currentDate.setDate(currentDate.getDate() - 4);
    currentDate.setHours(0, 0, 0, 0);

    return currentDate.toISOString();
}

const constructRainSumQuery = (): string => {
    const startDate = computeDateFourDaysAgo();
    return `
        from(bucket: "${bucket}")
          |> range(start: time(v: "${startDate}"), stop: now())
          |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Regen_Tag")
          |> filter(fn: (r) => r["_field"] == "value")
          |> aggregateWindow(every: 1d, fn: max)
          |> sum(column: "_value")
    `;
}

const rainsumQuery: string = constructRainSumQuery();

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

export {
    outTempQuery,
    windQuery,
    humidityQuery,
    rainsumQuery,
    rainTodayQuery,
    rainrate
};
