// Simple CLI to compute daily ET₀ (FAO-56) with manual inputs
// Usage example:
//   npm run et0 -- --doy 180 --tmin 15 --tmax 25 --rh 60 --wind 3.2 --pressure 900 --cloud 45

import { computeDailyET0FAO56, type DailyEt0Input } from "../utils/evapotranspiration.js";
import logger from "../logger.js";

type ArgSpec = {
  name: string;
  alias?: string;
  required?: boolean;
};

const specs: ArgSpec[] = [
  { name: "doy", required: true },
  { name: "tmin", required: true },
  { name: "tmax", required: true },
  { name: "rh", required: true },
  { name: "wind", required: true },
  { name: "pressure", required: true },
  { name: "cloud", required: true },
  // optional overrides
  { name: "lat" },
  { name: "elev" },
  { name: "albedo" },
  { name: "aS" },
  { name: "bS" },
  { name: "windZ" },
  { name: "verbose" },
];

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [keyRaw, maybeVal] = arg.slice(2).split("=", 2);
      const key = keyRaw.trim();
      if (maybeVal !== undefined) {
        out[key] = maybeVal;
      } else {
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
          out[key] = true;
        } else {
          out[key] = next;
          i++;
        }
      }
    }
  }
  return out;
}

function printUsageAndExit(msg?: string, code = 1) {
  if (msg) logger.error(msg);
  logger.error(
    "Usage: et0 --doy <1..366> --tmin <°C> --tmax <°C> --rh <percent> --wind <m/s@Z> --pressure <hPa> --cloud <0..100> [--lat <deg>] [--elev <m>] [--albedo <0..1>] [--aS <num>] [--bS <num>] [--windZ <m>] [--verbose]"
  );
  logger.error(
    "Example: --doy 180 --tmin 15 --tmax 25 --rh 60 --wind 3.2 --pressure 900 --cloud 45 --lat 46.5668 --elev 1060 --windZ 10"
  );
  process.exit(code);
}

function asNumber(val: any, name: string): number {
  const n = Number(val);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}: ${val}`);
  return n;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Check required args
  for (const s of specs) {
    if (s.required && args[s.name] === undefined && (!s.alias || args[s.alias] === undefined)) {
      printUsageAndExit(`Missing required argument --${s.name}`);
    }
  }

  try {
    const input: DailyEt0Input = {
      doy: asNumber(args.doy, "doy"),
      tminC: asNumber(args.tmin, "tmin"),
      tmaxC: asNumber(args.tmax, "tmax"),
      rhMeanPct: asNumber(args.rh, "rh"),
      windAtSensorMS: asNumber(args.wind, "wind"),
      pressureHPa: asNumber(args.pressure, "pressure"),
      cloudPct: asNumber(args.cloud, "cloud"),
      latDeg: args.lat !== undefined ? asNumber(args.lat, "lat") : undefined,
      elevMeters: args.elev !== undefined ? asNumber(args.elev, "elev") : undefined,
      albedo: args.albedo !== undefined ? asNumber(args.albedo, "albedo") : undefined,
      angstromAS: args.aS !== undefined ? asNumber(args.aS, "aS") : undefined,
      angstromBS: args.bS !== undefined ? asNumber(args.bS, "bS") : undefined,
      windSensorHeightM: args.windZ !== undefined ? asNumber(args.windZ, "windZ") : undefined,
    };

    const et0 = computeDailyET0FAO56(input);
    const verbose = Boolean(args.verbose);
    if (verbose) {
      logger.info(`Inputs: ${JSON.stringify(input, null, 2)}`);
    }
    logger.info(`ET0: ${et0.toFixed(2)} mm/day`);
  } catch (e) {
    printUsageAndExit((e as Error).message);
  }
}

main();
