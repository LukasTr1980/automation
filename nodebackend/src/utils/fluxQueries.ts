import { flux, ParameterizedQuery } from "@influxdata/influxdb-client";

const sensorBucket = "iobroker";
const et0Bucket = "automation";

// — Helper — ---------------------------------------------------------------
const computeDateSevenDaysAgo = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

// — Queries ----------------------------------------------------------------
export const outTempQuery = flux`
  from(bucket:"${sensorBucket}")
    |> range(start: -7d)
    |> filter(fn:(r)=>r._measurement=="javascript.0.Wetterstation.Aussentemperatur")
    |> filter(fn:(r)=>r._field=="value")
    |> mean(column:"_value")
`;

export const windQuery = flux`
  from(bucket:"${sensorBucket}")
    |> range(start: -7d)
    |> filter(fn:(r)=>r._measurement=="javascript.0.Wetterstation.Wind")
    |> filter(fn:(r)=>r._field=="value")
    |> mean(column:"_value")
`;

export const humidityQuery = flux`
  from(bucket:"${sensorBucket}")
    |> range(start: -7d)
    |> filter(fn:(r)=>r._measurement=="javascript.0.Wetterstation.FT0300_Feuchte_1")
    |> filter(fn:(r)=>r._field=="value")
    |> mean(column:"_value")
`;

export const constructRainSumQuery = (): ParameterizedQuery => {
  const start = computeDateSevenDaysAgo();
  return flux`
    from(bucket:"${sensorBucket}")
      |> range(start: time(v:"${start}"), stop: now())
      |> filter(fn:(r)=>r._measurement=="javascript.0.Wetterstation.Regen_Tag")
      |> filter(fn:(r)=>r._field=="value")
      |> aggregateWindow(every:1d, fn:max)
      |> sum(column:"_value")
  `;
};

export const rainTodayQuery = flux`
  import "timezone"
  option location = timezone.location(name:"Europe/Rome")
  from(bucket:"${sensorBucket}")
    |> range(start: today())
    |> filter(fn:(r)=>r._measurement=="javascript.0.Wetterstation.Regen_Tag")
    |> filter(fn:(r)=>r._field=="value")
    |> last()
`;

export const rainRateQuery = flux`
  from(bucket:"${sensorBucket}")
    |> range(start: -3h)
    |> filter(fn:(r)=>r._measurement=="javascript.0.Wetterstation.Weathercloud_Regenrate")
    |> filter(fn:(r)=>r._field=="value")
    |> last()
`;

/* ---------- NEW: ET₀-Wochensumme (7 Tage) ------------------------------ */
export const et0WeekQuery = flux`
  import "timezone"
  option location = timezone.location(name:"Europe/Rome")
  from(bucket:"${et0Bucket}")
    |> range(start: -7d)
    |> filter(fn:(r)=>r._measurement=="et0")
    |> filter(fn:(r)=>r._field=="value_numeric")
    |> aggregateWindow(every:1d, fn:last)
    |> sum(column:"_value")
`;

export const rainForecast24hQuery = flux`
  from(bucket:"${et0Bucket}")
    |> range(start: -2h)
    |> filter(fn:(r)=>r._measurement=="dwd.rain24h")
    |> filter(fn:(r)=>r._field=="value_numeric")
    |> last()
`;

/* ---------- Bewässerungstage in den letzten 7 Tagen ---------------------- */
export const irrigationDaysQuery = (zoneTopic: string): ParameterizedQuery => flux`
  import "timezone"
  option location = timezone.location(name:"Europe/Rome")
  from(bucket:"automation")
    |> range(start: -7d)
    |> filter(fn: (r) => r._measurement == "mqtt_data")
    |> filter(fn: (r) => r._field == "value_boolean")
    |> filter(fn: (r) => r["topic"] == ${zoneTopic!})
    // Boolean → Numeric (true=1, false=0)
    |> map(fn: (r) => ({ r with _value: if r._value then 1 else 0 }))
    // pro Tag den Maximalwert ermitteln, auch ohne Daten
    |> aggregateWindow(every: 1d, fn: max, createEmpty: true)
    // null oder 0 → 0, alles ≥1 → 1
    |> map(fn: (r) => ({ r with _value: if exists r._value and r._value > 0 then 1 else 0 }))
    // Anzahl der Tage mit Bewässerung aufsummieren
    |> sum(column: "_value")
`;
