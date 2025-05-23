import winston from "winston";
import { isDev } from "./envSwitcher";

/*
 * Automation‑wide Winston logger
 * – Zeitstempel vorn (YYYY-MM-DD HH:mm:ss)
 * – Level in Großbuchstaben, farbig (Console)
 * – Multiline‑Nachrichten sauber eingerückt
 * – Default‑Label "Automation"; Module können logger.child({ label: "Foo" }) nutzen
 */

// ---------- Helper: indent multi‑line messages -----------------------------
const indentMultiline = (input: unknown): string => {
  const str = typeof input === "string" ? input : JSON.stringify(input);
  return str
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n");
};

// ---------- Custom formatter ----------------------------------------------
const customFormat = winston.format.printf(info => {
  const lvl  = info.level.padEnd(5);               // already upper‑cased below
  const tag  = info.label ? `[${info.label}] ` : "";
  const msg  = indentMultiline(info.message);
  return `${info.timestamp} ${lvl} ${tag}${msg}`;
});

// ---------- Upper‑case transform (before colorize) ------------------------
const upperCaseLevel = winston.format(info => {
  info.level = info.level.toUpperCase();
  return info;
});

// ---------- Logger instance ----------------------------------------------
const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: winston.format.combine(
    upperCaseLevel(),
    winston.format.label({ label: "Automation" }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        upperCaseLevel(),                        // make sure console level is capped too
        winston.format.colorize({ level: true }),// color only level token
        winston.format.label({ label: "Automation" }),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        customFormat
      )
    })
  ]
});

export default logger;
