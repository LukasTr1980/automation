import winston from 'winston';
import { isDev } from './envSwitcher'; // Assuming you have this module to determine the environment

// Custom formatting function
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Determine the log level based on the environment
const logLevel = isDev ? 'debug' : 'info';

// Create a Winston logger
const logger = winston.createLogger({
  level: logLevel, // Log only if level is less than or equal to this level
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'DD-MM-YYYY HH:mm:ss'
    }),
    customFormat // use custom format here
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.timestamp({
          format: 'DD-MM-YYYY HH:mm:ss'
        })
      )
    })
  ]
});

export default logger;