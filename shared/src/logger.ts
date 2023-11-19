import winston from 'winston';
import * as envSwitcher from './envSwitcher';
import fs from 'fs';
import path from 'path';

// Define the log directory
const logDirectory = 'logs'; // Replace with your desired path

// Ensure that the log directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Custom formatting function
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create a Winston logger
const logger = winston.createLogger({
  level: 'info', // Log only if level is less than or equal to this level
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'DD-MM-YYYY HH:mm:ss'
    }),
    customFormat // use custom format here
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDirectory, 'combined.log') })
  ]
});

// If we're not in production, log to the console as well
if (envSwitcher.isDev) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.timestamp({
        format: 'DD-MM-YYYY HH:mm:ss'
      })
    )
  }));
}

export default logger;
