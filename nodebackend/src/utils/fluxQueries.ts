import { flux, ParameterizedQuery } from "@influxdata/influxdb-client";

const sensorBucket = "iobroker";
const et0Bucket = "automation";

// — Queries ----------------------------------------------------------------
export const outTempQuery = flux`
  from(bucket: "${sensorBucket}")
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

export const constructRainSumQuery = flux`
  import "date"
  import "timezone"
  option location = timezone.location(name: "Europe/Rome")

  stop = date.truncate(t: now(), unit: 1d)
  start = date.sub(d: 7d, from: stop)

  from(bucket: ${sensorBucket})
    |> range(start: start, stop: stop)
    |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Regen_Tag")
    |> filter(fn: (r) => r._field == "value")
    |> aggregateWindow(every: 1d, fn: max, createEmpty: true)
    |> sum(column: "_value")
`;

export const rainTodayQuery = flux`
  import "timezone"
  option location = timezone.location(name: "Europe/Rome")
  from(bucket: "${sensorBucket}")
    |> range(start: today())
    |> filter(fn: (r) => r._measurement == "javascript.0.Wetterstation.Regen_Tag")
    |> filter(fn: (r) => r._field == "value")
    |> last()
      `;

// rainRate now sourced from WeatherLink; Influx query removed

/* ---------- NEW: ET₀-Wochensumme (7 Tage) ------------------------------ */
export const et0WeekQuery = flux`
  import "date"
  import "timezone"
option location = timezone.location(name: "Europe/Rome")

  stop = date.truncate(t: now(), unit: 1d)
  start = date.sub(d: 7d, from: stop)

  from(bucket: ${et0Bucket})
    |> range(start: start, stop: stop)
    |> filter(fn: (r) => r._measurement == "et0")
    |> filter(fn: (r) => r._field == "value_numeric")
    |> aggregateWindow(every: 1d, fn: last, createEmpty: true)
    |> sum(column: "_value")
      `;

export const rainNextDayQuery = flux`
  from (bucket: "${et0Bucket}")
  |> range(start: -2h)
  |> filter(fn: (r) => r._measurement == "odh.rainNextDay")
  |> filter(fn: (r) => r._field == "value_numeric")
  |> last()
    `;

export const rainProbNextDayQuery = flux`
  from(bucket: "${et0Bucket}")
    |> range(start: -2h)
    |> filter(fn: (r) => r._measurement == "odh.rainProbNextDay")
    |> filter(fn: (r) => r._field == "value_numeric")
    |> last()
`;

/* ---------- Bewässerungstage in den letzten 7 Tagen ---------------------- */
export const irrigationDaysQuery = (zone: string): ParameterizedQuery => flux`
  import "date"
  import "timezone"
option location = timezone.location(name: "Europe/Rome")

  stop = date.truncate(t: now(), unit: 1d)         // heute 00:00
  start = date.sub(d: 7d, from: stop)               // 7 Tage davor, 00:00

  from(bucket: "automation")
    |> range(start: start, stop: stop)
    |> filter(fn: (r) => r._measurement == "irrigation_start")
    |> filter(fn: (r) => r._field == "started")
    |> filter(fn: (r) => r.zone == ${zone})
    |> map(fn: (r) => ({ r with _value: if r._value then 1 else 0 }))
    |> aggregateWindow(every: 1d, fn: max, createEmpty: true)
    |> map(fn: (r) => ({ r with _value: if r._value > 0 then 1 else 0 }))
    |> sum(column: "_value")
      `;
